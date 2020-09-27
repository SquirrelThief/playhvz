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
        let generatedId = Utils.generateFakeId();
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
        fakeDatabase.add(fakeDatabase.Type.group, game.id, generatedId, groupData);
        const chatData = FakeChatUtils.create(groupData.id, chatName, /* withAdmins= */ false);
        fakeDatabase.add(fakeDatabase.Type.chatRoom, game.id, chatData.id, chatData)
    }
}

/* Creates a group with no owners because the server is the manager. */
FakeGroupUtils.createManagedGroup = function (name, settings) {
    return new Group({
        name: name,
        managed: true,
        owners: [],
        settings: settings,
        members: []
    });
}


FakeGroupUtils.getGlobalGroupSettings = function (allegianceFilter) {
    return new Settings({
        canAddSelf: false,
        canAddOthers: false,
        canRemoveSelf: false,
        canRemoveOthers: false,
        autoAdd: true,
        autoRemove: true,
        allegianceFilter: allegianceFilter,
    });
}

FakeGroupUtils.getAdminGroupSettings = function (allegianceFilter) {
    return new Settings({
        canAddSelf: false,
        canAddOthers: false,
        canRemoveSelf: true,
        canRemoveOthers: true,
        autoAdd: false,
        autoRemove: false,
        allegianceFilter: allegianceFilter,
    });
}

