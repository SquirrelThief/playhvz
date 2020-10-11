/*
 * Copyright 2020 Google Inc.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

  http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
 */

/** Class to mimic locally what firebase functions would have done on the server side. */

class FakeGroupUtils { }

FakeGroupUtils.createManagedGroups = function (fakeDatabase, game) {
    let globalAllegiances = [
        [Defaults.EMPTY_ALLEGIANCE_FILTER, Defaults.globalChatName],
        [Defaults.EMPTY_ALLEGIANCE_FILTER, Defaults.gameAdminChatName],
        [Defaults.HUMAN_ALLEGIANCE_FILTER, Defaults.globalHumanChatName],
        [Defaults.ZOMBIE_ALLEGIANCE_FILTER, Defaults.globalZombieChatName]
    ]

    for ([allegianceFilter, chatName] of globalAllegiances) {
        let generatedId = fakeDatabase.idGenerator.generateId("group", chatName)
        let settings = FakeGroupUtils.getGlobalGroupSettings(allegianceFilter)
        if (chatName === Defaults.gameAdminChatName) {
            settings = FakeGroupUtils.getAdminGroupSettings(allegianceFilter)
            game.adminGroupId = generatedId
        }
        const groupData = FakeGroupUtils.createManagedGroup(
            chatName,
            settings,
        )
        groupData.id = generatedId
        fakeDatabase.setGroup(game.id, generatedId, groupData);
        const chatData = FakeChatUtils.create(fakeDatabase, groupData.id, chatName, /* withAdmins= */ false);
        fakeDatabase.setChatRoom(game.id, chatData.id, chatData)
    }
}

/* Creates a group with no owners because the server is the manager. */
FakeGroupUtils.createManagedGroup = function (name, settings) {
    return new Group({
        [GroupPath.FIELD__NAME]: name,
        [GroupPath.FIELD__MANAGED]: true,
        [GroupPath.FIELD__OWNERS]: [],
        [GroupPath.FIELD__SETTINGS]: settings,
        [GroupPath.FIELD__MEMBERS]: []
    });
}


FakeGroupUtils.getGlobalGroupSettings = function (allegianceFilter) {
    return new Settings({
        [GroupPath.FIELD__SETTINGS_ADD_SELF]: false,
        [GroupPath.FIELD__SETTINGS_ADD_OTHERS]: false,
        [GroupPath.FIELD__SETTINGS_REMOVE_SELF]: false,
        [GroupPath.FIELD__SETTINGS_REMOVE_OTHERS]: false,
        [GroupPath.FIELD__SETTINGS_AUTO_ADD]: true,
        [GroupPath.FIELD__SETTINGS_AUTO_REMOVE]: true,
        [GroupPath.FIELD__SETTINGS_ALLEGIANCE_FILTER]: allegianceFilter,
    });
}

FakeGroupUtils.getAdminGroupSettings = function (allegianceFilter) {
    return new Settings({
        [GroupPath.FIELD__SETTINGS_ADD_SELF]: false,
        [GroupPath.FIELD__SETTINGS_ADD_OTHERS]: false,
        [GroupPath.FIELD__SETTINGS_REMOVE_SELF]: true,
        [GroupPath.FIELD__SETTINGS_REMOVE_OTHERS]: true,
        [GroupPath.FIELD__SETTINGS_AUTO_ADD]: false,
        [GroupPath.FIELD__SETTINGS_AUTO_REMOVE]: false,
        [GroupPath.FIELD__SETTINGS_ALLEGIANCE_FILTER]: allegianceFilter,
    });
}

FakeGroupUtils.createSettings = function (
    addSelf,
    addOthers,
    removeSelf,
    removeOthers,
    autoAdd,
    autoRemove,
    allegianceFilter) {
    return new Settings({
        [GroupPath.FIELD__SETTINGS_ADD_SELF]: addSelf,
        [GroupPath.FIELD__SETTINGS_ADD_OTHERS]: addOthers,
        [GroupPath.FIELD__SETTINGS_REMOVE_SELF]: removeSelf,
        [GroupPath.FIELD__SETTINGS_REMOVE_OTHERS]: removeOthers,
        [GroupPath.FIELD__SETTINGS_AUTO_ADD]: autoAdd,
        [GroupPath.FIELD__SETTINGS_AUTO_REMOVE]: autoRemove,
        [GroupPath.FIELD__SETTINGS_ALLEGIANCE_FILTER]: allegianceFilter
    });
}

FakeGroupUtils.updatePlayerMembershipInGroups = function (fakeDatabase, gameId, player) {
    FakeGroupUtils.addPlayerToManagedGroups(fakeDatabase, gameId, player, /* ignoreAllegiance= */ false)
    FakeGroupUtils.removePlayerFromGroups(fakeDatabase, gameId, player)
}

// Add a new player to managed groups
FakeGroupUtils.addPlayerToManagedGroups = function (fakeDatabase, gameId, player, ignoreAllegiance) {
    let playerAllegiance = player[PlayerPath.FIELD__ALLEGIANCE]
    let groups = fakeDatabase.getAllGroupsOfGame(gameId)
    let managedGroups = []
    for (let group of groups) {
        if (group[GroupPath.FIELD__MANAGED] == true && group[GroupPath.FIELD__SETTINGS][GroupPath.FIELD__SETTINGS_AUTO_ADD] == true) {
            managedGroups.push(group);
        }
    }
    for (let group of managedGroups) {
        let groupAllegiance = group[GroupPath.FIELD__SETTINGS][GroupPath.FIELD__SETTINGS_ALLEGIANCE_FILTER]
        if (ignoreAllegiance || groupAllegiance === Defaults.EMPTY_ALLEGIANCE_FILTER || groupAllegiance === playerAllegiance) {
            // The player matches the allegiance requirements, add them to the group
            FakeGroupUtils.addPlayerToGroup(fakeDatabase, gameId, group.id, player)
        }
    }
    // If player is game creator then add their player id to the game and add them to the managed admin group.
    let game = fakeDatabase.getGame(gameId)
    if (player[PlayerPath.FIELD__USER_ID] === game[GamePath.FIELD__CREATOR_USER_ID]) {
        let group = fakeDatabase.getGroup(gameId, game[GamePath.FIELD__ADMIN_GROUP_ID])
        group[GroupPath.FIELD__OWNERS].push(player.id)
        FakeGroupUtils.addPlayerToGroup(fakeDatabase, gameId, group.id, player)
        // Also set game creator as default "Admin On Call"
        game[GamePath.FIELD__ADMIN_ON_CALL_PLAYER_ID] = player.id
    }
}

// Remove player from *any* auto-remove groups
FakeGroupUtils.removePlayerFromGroups = function (fakeDatabase, gameId, player) {
    let playerAllegiance = player[PlayerPath.FIELD__ALLEGIANCE]
    let groups = fakeDatabase.getAllGroupsOfGame(gameId)
    let autoRemoveGroups = []
    for (let group of groups) {
        if (group[GroupPath.FIELD__SETTINGS][GroupPath.FIELD__SETTINGS_AUTO_REMOVE] == true) {
            autoRemoveGroups.push(group);
        }
    }
    for (let group of autoRemoveGroups) {
        let groupAllegiance = group[GroupPath.FIELD__SETTINGS][GroupPath.FIELD__SETTINGS_ALLEGIANCE_FILTER]
        if (groupAllegiance !== Defaults.EMPTY_ALLEGIANCE_FILTER && groupAllegiance !== playerAllegiance) {
            // The player does not match the allegiance requirements, remove them from the group
            FakeGroupUtils.removePlayerFromGroup(fakeDatabase, gameId, group.id, player)
        }
    }
}

/** Adds player to group and updates chat memberships if there is a chat room associated with the group. */
FakeGroupUtils.addPlayerToGroup = function (fakeDatabase, gameId, groupId, player) {
    // Check if group is associated with Chat
    let group = fakeDatabase.getGroup(gameId, groupId)
    let chats = fakeDatabase.getAllChatsOfGame(gameId)
    let groupChatRoom = null
    for (let chat of chats) {
        if (chat[ChatPath.FIELD__ASSOCIATED_GROUP_ID] == group.id) {
            groupChatRoom = chat;
        }
    }
    if (groupChatRoom == null) {
        // Group is not associated with any chat rooms, just update membership directly
        group[GroupPath.FIELD__MEMBERS].push(player.id)
        return
    }
    // Group is associated with a chat room (we can assume only one chat room per group).
    FakeChatUtils.addPlayerToChat(fakeDatabase, gameId, player, groupId, groupChatRoom)
}

FakeGroupUtils.removePlayerFromGroup = function (fakeDatabase, gameId, groupId, player) {
    // Check if group is associated with Chat
    let group = fakeDatabase.getGroup(gameId, groupId)
    let chats = fakeDatabase.getAllChatsOfGame(gameId)
    let groupChatRoom = null
    for (let chat of chats) {
        if (chat[ChatPath.FIELD__ASSOCIATED_GROUP_ID] == group.id) {
            groupChatRoom = chat;
        }
    }
    if (groupChatRoom == null) {
        // Group is not associated with any chat rooms, just update membership directly
        let position = group[GroupPath.FIELD__MEMBERS].indexOf(player.id)
        if (position) {
            group[GroupPath.FIELD__MEMBERS].splice(position, 1);
        }
        return
    }
    // Group is associated with a chat room (we can assume only one chat room per group).
    FakeChatUtils.removePlayerFromChat(fakeDatabase, gameId, player, groupId, groupChatRoom)
}

FakeGroupUtils.createGroupAndChat = function (fakeDatabase, gameId, playerId, chatName, settings) {
    const group = FakeGroupUtils.createPlayerOwnedGroup(playerId, chatName, settings)
    group.id = fakeDatabase.idGenerator.generateId("group", chatName)
    fakeDatabase.setGroup(gameId, group.id, group);
    const chatRoom = new ChatRoom({
        [ChatPath.FIELD__ASSOCIATED_GROUP_ID]: group.id,
        [ChatPath.FIELD__NAME]: chatName,
        [ChatPath.FIELD__WITH_ADMINS]: false
    });
    chatRoom.id = fakeDatabase.idGenerator.generateId("chat", chatName)
    fakeDatabase.setChatRoom(gameId, chatRoom.id, chatRoom)
    let player = fakeDatabase.getPlayer(gameId, playerId);
    FakeChatUtils.addPlayerToChat(fakeDatabase, gameId, player, group.id, chatRoom)
    return chatRoom.id;
}

FakeGroupUtils.createPlayerOwnedGroup = function (ownerId, name, settings) {
    return new Group({
        [GroupPath.FIELD__NAME]: name,
        [GroupPath.FIELD__MANAGED]: false,
        [GroupPath.FIELD__OWNERS]: [ownerId],
        [GroupPath.FIELD__SETTINGS]: settings,
        [GroupPath.FIELD__MEMBERS]: []
    });
}



FakeGroupUtils.createGroupAndMission = function (
    fakeDatabase,
    gameId,
    settings,
    missionName,
    startTime,
    endTime,
    details,
    allegianceFilter
) {
    const group = FakeGroupUtils.createManagedGroup(missionName, settings)
    const groupId = fakeDatabase.idGenerator.generateId("group", missionName)
    group.id = groupId;
    fakeDatabase.setGroup(gameId, groupId, group);
    const mission = new Mission({
        [MissionPath.FIELD__GROUP_ID]: groupId,
        [MissionPath.FIELD__NAME]: missionName,
        [MissionPath.FIELD__START_TIME]: startTime,
        [MissionPath.FIELD__END_TIME]: endTime,
        [MissionPath.FIELD__DETAILS]: details,
        [MissionPath.FIELD__ALLEGIANCE_FILTER]: allegianceFilter
    });
    const missionId = fakeDatabase.idGenerator.generateId("mission", missionName)
    mission.id = missionId;
    fakeDatabase.setMission(gameId, missionId, mission);
    FakeGroupUtils.updateMissionMembership(fakeDatabase, gameId, groupId)
}

// Handles Auto-adding and Auto-removing members
FakeGroupUtils.updateMissionMembership = function (fakeDatabase, gameId, groupId) {
    FakeGroupUtils.autoUpdateMembers(fakeDatabase, gameId, groupId)
}

// Replaces members with members of the correct allegiance if appropriate
FakeGroupUtils.autoUpdateMembers = function (fakeDatabase, gameId, groupId) {
    const group = fakeDatabase.getGroup(gameId, groupId);
    if (group[GroupPath.FIELD__MANAGED] !== true
        && group[GroupPath.FIELD__SETTINGS][GroupPath.FIELD__SETTINGS_AUTO_ADD] !== true) {
        return
    }
    let players = fakeDatabase.getAllPlayersOfGame(gameId);
    if (group[GroupPath.FIELD__SETTINGS][GroupPath.FIELD__SETTINGS_ALLEGIANCE_FILTER] != Defaults.EMPTY_ALLEGIANCE_FILTER) {
        // Extract players of the right allegiance
        let allegiancePlayerIds = []
        for (let player of players) {
            if (player[PlayerPath.FIELD__ALLEGIANCE] == group[GroupPath.FIELD__SETTINGS][GroupPath.FIELD__SETTINGS_ALLEGIANCE_FILTER]) {
                allegiancePlayerIds.push(player.id);
            }
            players = allegiancePlayerIds;
        }
    } else {
        let playerIds = []
        for (let player of players) {
            playerIds.push(player.id)
        }
        players = playerIds
    }

    const game = fakeDatabase.getGame(gameId);
    players.push(game[GamePath.FIELD__FIGUREHEAD_ADMIN_PLAYER_ACCOUNT])
    if (players.length > 0) {
        group[GroupPath.FIELD__MEMBERS].push(...players)
    }
}
