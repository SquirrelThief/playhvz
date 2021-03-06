// Copyright 2017 Google Inc.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

/** 
 * This file fakes all the logic that happens in our Firebase Functions, directly creating
 * the objects we expect and reading them back with no error checking, etc.
 */
'use strict';

class FakeServer {
  constructor(idGenerator) {
    this.idGenerator = idGenerator;
    this.game = null;
    this.fakeDatabase = new FakeDatabase(idGenerator)
    window.fakeServer = this;
  }

  getTime_(args) {
    let { requestTimeOffset } = args;
    if (!requestTimeOffset)
      requestTimeOffset = 0;
    return new Date().getTime() + requestTimeOffset;
  }

  register(args) {
    let { userId } = args;
    let user = new User({ userId: userId })
    this.fakeDatabase.setUser(userId, user)
    return userId;
  }

  createGame(args) {
    let { gameId, creatorUserId } = args;
    this.game = new Game({
      id: gameId,
      name: args["name"],
      startTime: args["startTime"],
      endTime: args["endTime"],
      creatorUserId: creatorUserId,
    });
    this.fakeDatabase.setGame(gameId, this.game)
    FakeGroupUtils.createManagedGroups(this.fakeDatabase, this.game);
    FakeRewardUtils.createManagedRewards(this.fakeDatabase, this.game)
    FakePlayerUtils.createFigureHeadPlayer(this.fakeDatabase, this.game)
  }

  joinGame(userId, gameName, playerName) {
    let games = this.fakeDatabase.getAllGames()
    let gameId = null
    for (let game of games) {
      if (game.name == gameName) {
        gameId = game.id;
        break;
      }
    }
    assert(gameId)
    let player = FakePlayerUtils.create(userId, playerName);
    player.id = this.fakeDatabase.idGenerator.generateId("player", "");
    this.fakeDatabase.setPlayer(gameId, player.id, player)
    return player.id
  }

  getGameList(userId) {
    let games = this.fakeDatabase.getAllGames()
    let playerGames = []
    for (let game of games) {
      for (let player of this.fakeDatabase.getAllPlayersOfGame(game.id)) {
        if (player.userId == userId) {
          playerGames.push(game)
          continue;
        }
      }
    }
    return playerGames
  }

  getGame(gameId) {
    let games = this.fakeDatabase.getAllGames()
    for (let game of games) {
      if (game.id == gameId) {
        return game
      }
    }
  }

  getPlayer(userId, gameId) {
    for (let player of this.fakeDatabase.getAllPlayersOfGame(gameId)) {
      if (player.userId == userId) {
        return player
      }
    }
    return null
  }

  listenToPlayer(gameId, playerId) {
    return this.fakeDatabase.getPlayer(gameId, playerId);
  }

  changePlayerAllegiance(gameId, playerId, newAllegiance) {
    return FakePlayerUtils.internallyChangePlayerAllegiance(
      this.fakeDatabase,
      gameId,
      playerId,
      newAllegiance,
      this.getTime_({ requestTimeOffset: 5 }),
      this.idGenerator.newPublicLifeId("allegiancechange"))
  }

  listenToGroup(gameId, groupId) {
    return this.fakeDatabase.getGroup(gameId, groupId)
  }

  listenToChatRoom(gameId, chatRoomId) {
    return this.fakeDatabase.getChatRoom(gameId, chatRoomId);
  }

  listenToChatRoomMessages(gameId, chatRoomId) {
    return this.fakeDatabase.getAllChatMessages(gameId, chatRoomId);
  }

  sendChatMessage(gameId, messageId, chatRoomId, playerId, message) {
    let firebaseMessage = FakeChatUtils.createMessage(this.fakeDatabase, playerId, this.getTime_({ requestTimeOffset: 5 }), message)
    firebaseMessage.id = messageId;
    this.fakeDatabase.setChatMessage(gameId, chatRoomId, firebaseMessage);
  }

  infectPlayerByLifeCode(gameId, infectorPlayerId, victimLifeCode) {
    // Check if life code is associated with valid human player.
    let infectorPlayer;
    let victimPlayer;
    for (let player of this.fakeDatabase.getAllPlayersOfGame(gameId)) {
      if (player.id == infectorPlayerId) {
        infectorPlayer = player;
      }
      let lifeCodes = Object.keys(player[PlayerPath.FIELD__LIVES]);
      if (lifeCodes.length > 0 && lifeCodes.includes(victimLifeCode)) {
        victimPlayer = player;
      }
    }
    // TODO: handle player infecting themselves.
    if (!victimPlayer) {
      // Nobody had that lifecode...
      return;
    }
    FakeRewardUtils.giveRewardForInfecting(this.fakeDatabase, gameId, infectorPlayer.id, this.getTime_({ requestTimeOffset: 5 }))
    // Mark life code as used, aka deactivated
    victimPlayer[PlayerPath.FIELD__LIVES][victimLifeCode][PlayerPath.FIELD__LIFE_CODE_STATUS] = false;
    const lives = victimPlayer[PlayerPath.FIELD__LIVES]
    for (const key of Object.keys(lives)) {
      const metadata = lives[key]
      if (metadata[PlayerPath.FIELD__LIFE_CODE_STATUS] == true) {
        // Player still has some lives left, don't turn them into a zombie.
        return;
      }
    }
    return FakePlayerUtils.internallyChangePlayerAllegiance(
      this.fakeDatabase,
      gameId,
      victimPlayer.id,
      Defaults.ZOMBIE_ALLEGIANCE_FILTER,
      this.getTime_({ requestTimeOffset: 5 }),
        /* newLifeCode= */ "");
  }

  listenToReward(gameId, rewardId) {
    return this.fakeDatabase.getReward(gameId, rewardId);
  }

  createChatRoom(gameId, ownerId, chatName, allegianceFilter) {
    const settings = new Settings({
      addSelf: true,
      addOthers: true,
      removeSelf: true,
      removeOthers: true,
      autoAdd: false,
      autoRemove: allegianceFilter !== Defaults.EMPTY_ALLEGIANCE_FILTER,
      allegianceFilter: allegianceFilter
    });
    return FakeGroupUtils.createGroupAndChat(this.fakeDatabase, gameId, ownerId, chatName, settings);
  }

  /* Returns a valid chat room id. */
  createOrGetChatWithAdmin(gameId, playerId) {
    let player = this.fakeDatabase.getPlayer(gameId, playerId);
    let playerChatRoomIds = Object.keys(player.chatRoomMemberships);
    let game = this.fakeDatabase.getGame(gameId);
    let adminPlayerId = game.figureheadAdminPlayerAccount
    let existingAdminChatId = this.fakeDatabase.getAdminChatFromListOfChatRooms(gameId, playerChatRoomIds);
    if (existingAdminChatId) {
      // Admin chat already exists, reusing the existing chat. Make sure it's visible to everyone
      player.chatRoomMemberships[existingAdminChatId].isVisible = true;
      // "Add" the admin to the chat. Even if they are already in it, this resets their notification
      // and visibility settings so the chat reappears for them.
      let adminChatRoom = this.fakeDatabase.getChatRoom(gameId, existingAdminChatId);
      FakeChatUtils.addPlayerToChat(this.fakeDatabase, gameId, this.fakeDatabase.getPlayer(gameId, adminPlayerId), adminChatRoom.associatedGroupId, adminChatRoom);
      return existingAdminChatId
    }
    // Create admin chat since it doesn't exist.
    const chatName = player.name + " & " + Defaults.FIGUREHEAD_ADMIN_NAME;
    const settings = FakeGroupUtils.createSettings(
    /* addSelf= */ true,
    /* addOthers= */ false,
    /* removeSelf= */ true,
    /* removeOthers= */ false,
    /* autoAdd= */ false,
    /* autoRemove= */ false,
      Defaults.EMPTY_ALLEGIANCE_FILTER);
    let createdChatId = FakeGroupUtils.createGroupAndChat(this.fakeDatabase, gameId, playerId, chatName, settings, /* withAdmins= */ true);
    return createdChatId;
  }

  addPlayersToChat(gameId, groupId, chatRoomId, playerIdList) {
    const chatRoom = this.fakeDatabase.getChatRoom(gameId, chatRoomId);
    for (let playerId of playerIdList) {
      FakeChatUtils.addPlayerToChat(this.fakeDatabase, gameId, this.fakeDatabase.getPlayer(gameId, playerId), groupId, chatRoom);
    }
  }

  createMission(gameId, missionName, startTime, endTime, details, allegianceFilter) {
    const settings = FakeGroupUtils.createSettings(
    /* addSelf= */ false,
    /* addOthers= */ false,
    /* removeSelf= */ false,
    /* removeOthers= */ false,
    /* autoAdd= */ true,
    /* autoRemove= */ allegianceFilter !== Defaults.EMPTY_ALLEGIANCE_FILTER,
      allegianceFilter);

    FakeGroupUtils.createGroupAndMission(
      this.fakeDatabase,
      gameId,
      settings,
      missionName,
      startTime,
      endTime,
      details,
      allegianceFilter
    )
  }

  listenToLastMission(gameId, playerId) {
    // Get all the group ids that are related to missions.
    let allMissions = this.fakeDatabase.getAllMissionsOfGame(gameId);
    let allMissionGroupIds = [];
    for (let mission of allMissions) {
      allMissionGroupIds.push(mission[MissionPath.FIELD__GROUP_ID])
    }
    // Check every mission-group to see if the player is a member of that group
    let allGroups = this.fakeDatabase.getAllGroupsOfGame(gameId);
    let missionGroupsPlayerIsIn = [];
    for (let group of allGroups) {
      if (allMissionGroupIds.includes(group.id) && group[GroupPath.FIELD__MEMBERS].includes(playerId)) {
        missionGroupsPlayerIsIn.push(group.id);
      }
    }
    // Get all the missions that the player is in (based on mission-group membership)
    let playerMissions = []
    for (let mission of allMissions) {
      if (missionGroupsPlayerIsIn.includes(mission[MissionPath.FIELD__GROUP_ID])) {
        playerMissions.push(mission);
      }
    }
    // Sort missions by end time
    let comparitor = function (mission1, mission2) {
      if (mission1[MissionPath.FIELD__END_TIME] > mission2[MissionPath.FIELD__END_TIME]) {
        return 1;
      } else if (mission1[MissionPath.FIELD__END_TIME] < mission2[MissionPath.FIELD__END_TIME]) {
        return -1;
      }
      return 0;
    }
    playerMissions.sort(comparitor);
    // Return the last mission
    return playerMissions[playerMissions.length - 1]
  }

  listenToMission(gameId, missionId) {
    return this.fakeDatabase.getMission(gameId, missionId);
  }

  listenToMissionList(gameId, playerId) {
    // Get all the group ids that are related to missions.
    let allMissions = this.fakeDatabase.getAllMissionsOfGame(gameId);
    let allMissionGroupIds = [];
    for (let mission of allMissions) {
      allMissionGroupIds.push(mission[MissionPath.FIELD__GROUP_ID])
    }
    // Check every mission-group to see if the player is a member of that group
    let allGroups = this.fakeDatabase.getAllGroupsOfGame(gameId);
    let missionGroupsPlayerIsIn = [];
    for (let group of allGroups) {
      if (allMissionGroupIds.includes(group.id) && group[GroupPath.FIELD__MEMBERS].includes(playerId)) {
        missionGroupsPlayerIsIn.push(group.id);
      }
    }
    // Get all the missions that the player is in (based on mission-group membership)
    let playerMissions = []
    for (let mission of allMissions) {
      if (missionGroupsPlayerIsIn.includes(mission[MissionPath.FIELD__GROUP_ID])) {
        playerMissions.push(mission);
      }
    }
    // Sort missions by end time
    let comparitor = function (mission1, mission2) {
      if (mission1[MissionPath.FIELD__END_TIME] > mission2[MissionPath.FIELD__END_TIME]) {
        return 1;
      } else if (mission1[MissionPath.FIELD__END_TIME] < mission2[MissionPath.FIELD__END_TIME]) {
        return -1;
      }
      return 0;
    }
    playerMissions.sort(comparitor);
    return playerMissions
  }

  createReward(gameId, shortName, longName, description, imageUrl, points) {
    let reward = new Reward({
      shortName: shortName,
      longName: longName,
      description: description,
      imageUrl: imageUrl,
      points: points,
      claimCodes: {}
    });
    reward.id = this.fakeDatabase.idGenerator.generateId("reward", shortName);
    return this.fakeDatabase.setReward(gameId, reward.id, reward);
  }

  generateClaimCodes(gameId, rewardId, numCodes) {
    let existingClaimCodes = this.fakeDatabase.getAllClaimCodesForReward(gameId, rewardId);
    for (let i = 0; i < numCodes; i++) {
      let index = i + existingClaimCodes.length;
      let shortName = rewardId.split("-", 2)[1]; // Extracts reward shortname from id
      let claimCodeObject = FakeRewardUtils.createRewardClaimCode(shortName + "-claim-" + index);
      claimCodeObject.id = claimCodeObject.code;
      this.fakeDatabase.setClaimCode(gameId, rewardId, claimCodeObject.id, claimCodeObject);
    }
  }

  redeemRewardCode(gameId, playerId, claimCode) {
    // Check if claim code is associated with valid reward.
    const shortName = FakeRewardUtils.extractShortNameFromCode(claimCode)
    let reward = this.fakeDatabase.getRewardByShortName(gameId, shortName);
    if (reward == null) {
      return
    }

    // If the middle code matches the player id then this is a reward we're granting them. Let it be so.
    const secondCode = FakeRewardUtils.extractPlayerIdFromCode(claimCode)
    if (secondCode === playerId.toLowerCase()) {
      let newClaimCodeObject = FakeRewardUtils.createRewardClaimCode(claimCode);
      newClaimCodeObject.id = newClaimCodeObject.code;
      this.fakeDatabase.setClaimCode(gameId, reward.id, newClaimCodeObject.id, newClaimCodeObject);
    }

    // Check if reward code is valid.
    let claimCodeObject = this.fakeDatabase.getUnredeemedClaimCodeByCode(gameId, reward, claimCode);
    if (claimCodeObject == null) {
      return;
    }

    // Redeem claim code!
    claimCodeObject.redeemer = playerId;
    claimCodeObject.timestamp = this.getTime_({});
    let player = this.fakeDatabase.getPlayer(gameId, playerId);
    let count = 1;
    if (player.rewards[reward.id] != undefined) {
      count = player.rewards[reward.id] + 1
    }
    player.rewards[reward.id] = count; // Can't += 1 because ends up as NaN if undefined
    player.points += reward.points
  }

  addPlayersToGroup(gameId, groupId, playerIdList) {
    for (let playerId of playerIdList) {
      let player = this.fakeDatabase.getPlayer(gameId, playerId);
      FakeGroupUtils.addPlayerToGroup(this.fakeDatabase, gameId, groupId, player);
    }
  }


  setAdminContact(args) {
    let { playerId } = args;
    this.writer.set(["adminContactPlayerId"], playerId);
  }
  updateGame(args) {
    for (let argName in args) {
      this.writer.set([argName], args[argName]);
    }
  }
  addAdmin(args) {
    let { userId } = args;
    this.writer.insert(
      this.reader.getAdminPath(null),
      null,
      new Model.Admin(userId, { userId: userId }));
  }
  addDefaultProfileImage(args) {
    let { defaultProfileImageId } = args;
    this.writer.insert(
      this.reader.getDefaultProfileImagePath(null),
      null,
      new Model.DefaultProfileImage(defaultProfileImageId, args)
    );
  }
  createPlayer(args) {
    let { playerId, privatePlayerId, userId } = args;
    let publicPlayerId = playerId;
    let game = this.game;

    if (!privatePlayerId)
      privatePlayerId = this.idGenerator.newPrivatePlayerId();

    let properties = Utils.copyOf(args);
    properties.allegiance = 'undeclared';
    properties.userId = userId;
    properties.canInfect = false;
    properties.points = 0;
    properties.number = 101 + game.players.length;

    let publicPlayer = new Model.PublicPlayer(publicPlayerId, properties);
    publicPlayer.private = new Model.PrivatePlayer(privatePlayerId, properties);
    publicPlayer.private.volunteer = properties.volunteer;
    publicPlayer.private.notificationSettings = properties.notificationSettings;

    this.writer.insert(this.reader.getPublicPlayerPath(null), null, publicPlayer);

    this.updateMembershipsOnAllegianceChange(publicPlayerId);
  }
  createGroup(args) {
    let { groupId } = args;
    new Model.Group(groupId, args).initialize({}, this.game, this.writer);
  }
  updateGroup(args) {
    throwError('Implement!');
  }
  setLastSeenChatTime(args) {
    throwError('Implement!');
  }
  createMap(args) {
    let { mapId } = args;
    this.writer.insert(
      this.reader.getMapPath(null),
      null,
      new Model.Map(mapId, args));
  }
  updateMap(args) {
    throwError('Implement!');
  }
  addMarker(args) {
    let { markerId, mapId } = args;
    this.writer.insert(
      this.reader.getMarkerPath(mapId, null),
      null,
      new Model.Marker(markerId, args));
  }

  updateChatRoom(args) {
    throwError('Implement!');
  }
  updatePlayer(args) {
    let { playerId } = args;
    for (let argName in args) {
      if (Model.PUBLIC_PLAYER_PROPERTIES.includes(argName)) {
        this.writer.set(
          this.reader.getPublicPlayerPath(playerId).concat([argName]),
          args[argName]);
      }
    }
    for (let argName in args) {
      if (Model.PRIVATE_PLAYER_PROPERTIES.includes(argName)) {
        this.writer.set(
          this.reader.getPrivatePlayerPath(playerId).concat([argName]),
          args[argName]);
      }
    }
  }

  addPlayerToGroup(args) {
    let { groupId, playerToAddId } = args;
    let game = this.game;
    let player = game.playersById[playerToAddId];
    let group = game.groupsById[groupId];

    let existingMembership = group.playersById[playerToAddId];
    if (existingMembership)
      return;

    if (group.allegianceFilter != 'none' && group.allegianceFilter != player.allegiance)
      throw 'Player does not satisfy this group\'s allegiance filter!';

    this.writer.insert(
      this.reader.getGroupPlayerPath(groupId, null),
      null,
      playerToAddId);

    for (let chatRoom of game.chatRooms) {
      if (chatRoom.accessGroupId == groupId) {
        this.addPlayerToChatRoom_(chatRoom.id, playerToAddId);
      }
    }
    for (let mission of game.missions) {
      if (mission.accessGroupId == groupId) {
        this.addPlayerToMission_(mission.id, playerToAddId);
      }
    }
  }

  removePlayerFromGroup(args) {
    let { groupId, playerToRemoveId } = args;
    let playerId = playerToRemoveId;
    let game = this.game;
    let player = game.playersById[playerId];
    let group = game.groupsById[groupId];

    let existingMembership = group.playersById[playerId];
    if (!existingMembership)
      return;

    if (playerId == group.ownerPlayerId) {
      this.switchGroupOwnership(playerId, group, game)
    }

    for (let chatRoom of game.chatRooms) {
      if (chatRoom.accessGroupId == groupId) {
        this.removePlayerFromChatRoom_(chatRoom.id, playerId);
      }
    }

    for (let mission of game.missions) {
      if (mission.accessGroupId == groupId) {
        this.removePlayerFromMission_(mission.id, playerId);
      }
    }

    let membershipPath = this.reader.getGroupPlayerPath(groupId, playerId);
    this.writer.remove(
      membershipPath.slice(0, membershipPath.length - 1),
      membershipPath.slice(-1)[0], // index
      playerId);
  }

  addPlayerToChatRoom_(chatRoomId, playerId) {
    // Assumes already added to group
    this.writer.insert(
      this.reader.getPlayerChatRoomMembershipPath(playerId, null),
      null,
      new Model.PlayerChatRoomMembership(chatRoomId, {
        chatRoomId: chatRoomId,
        lastHiddenTime: null,
        lastSeenTime: null,
      }));
  }

  addPlayerToMission_(missionId, playerId) {
    // Assumes already added to group
    this.writer.insert(
      this.reader.getPlayerMissionMembershipPath(playerId, null),
      null,
      new Model.PlayerMissionMembership(missionId, { missionId: missionId }));
  }

  removePlayerFromChatRoom_(chatRoomId, playerId) {
    // Assumes still in the group, and will be removed after this call
    let playerChatRoomMembershipPath = this.reader.getPlayerChatRoomMembershipPath(playerId, chatRoomId);
    this.writer.remove(
      playerChatRoomMembershipPath.slice(0, playerChatRoomMembershipPath.length - 1),
      playerChatRoomMembershipPath.slice(-1)[0],
      chatRoomId);
  }

  removePlayerFromMission_(missionId, playerId) {
    // Assumes still in the group, and will be removed after this call
    let playerMissionMembershipPath = this.reader.getPlayerMissionMembershipPath(playerId, missionId);
    this.writer.remove(
      playerMissionMembershipPath.slice(0, playerMissionMembershipPath.length - 1),
      playerMissionMembershipPath.slice(-1)[0],
      missionId);
  }

  getMessageTargets(message, group, senderId) {
    let notificationPlayerIds = [];
    let ackRequestPlayerIds = [];
    let textRequestPlayerIds = [];

    while (true) {
      let ackRequestRegex = /@(\?|!)?(\w+)\b\s*/;
      let messageMatch = message.match(ackRequestRegex);
      if (!messageMatch) {
        break;
      }
      message = message.replace(messageMatch[0], "");

      let newTargetPlayerIds = [];
      let playerName = messageMatch[2];
      if (playerName == 'all') {
        newTargetPlayerIds = group.players.slice();
      } else {
        let player = this.game.players.find(player => player.name.toLowerCase() == playerName.toLowerCase());
        if (!player) {
          throw "Couldn't find a player by the name '" + playerName + "'!";
        }
        newTargetPlayerIds = [player.id];
      }
      notificationPlayerIds = notificationPlayerIds.concat(newTargetPlayerIds);
      let senderIndex = notificationPlayerIds.indexOf(senderId);
      if (senderIndex != -1) {
        notificationPlayerIds.splice(senderIndex, 1);
      }
      if (messageMatch[1] == '!') {
        ackRequestPlayerIds = ackRequestPlayerIds.concat(newTargetPlayerIds);
      } else if (messageMatch[1] == '?') {
        textRequestPlayerIds = textRequestPlayerIds.concat(newTargetPlayerIds);
      }
    }

    return [message, notificationPlayerIds, ackRequestPlayerIds, textRequestPlayerIds];
  }

  /*
  sendChatMessage(args) {
    let { gameId, chatRoomId, playerId, messageId, message } = args;
 
    let game = this.game;
    let player = game.playersById[playerId];
    let chatRoom = game.chatRoomsById[chatRoomId];
    let group = game.groupsById[chatRoom.accessGroupId];
 
    // Make this chat room visible to everyone, since there's a new message.
    for (let publicPlayerId of group.players) {
      let member = game.playersById[publicPlayerId];
      let chatRoomMembership = player.private.chatRoomMemberships.find(m => m.chatRoomId = chatRoomId);
      // Change the chat room to visible
      this.updateChatRoomMembership({
        gameId: gameId,
        chatRoomId: chatRoomId,
        actingPlayerId: publicPlayerId,
        lastHiddenTime: null,
      });
    }
 
    if (group.playersById[player.id]) {
      this.writer.insert(
        this.reader.getChatRoomPath(chatRoomId).concat(["messages"]),
        null,
        new Model.Message(messageId, Utils.merge(args, {
          time: this.getTime_(args),
          playerId: playerId,
        })));
    } else {
      throw 'Can\'t send message to chat room without membership';
    }
  }
*/
  sendRequests(chatRoomId, senderPlayerId, type, message, playerIds) {
    let requestCategoryId = this.idGenerator.newRequestCategoryId();
    this.addRequestCategory({
      requestCategoryId: requestCategoryId,
      chatRoomId: chatRoomId,
      playerId: senderPlayerId,
      text: message,
      type: type,
      dismissed: false,
    });
    for (let playerId of playerIds) {
      this.addRequest({
        requestCategoryId: requestCategoryId,
        requestId: this.idGenerator.newRequestId(),
        playerId: playerId,
      });
    }
  }

  updateChatRoomMembership(args) {
    let { chatRoomId, actingPlayerId } = args;
    let playerId = actingPlayerId;
    let game = this.game;
    let player = game.playersById[playerId];

    let playerChatRoomMembershipPath = this.reader.getPlayerChatRoomMembershipPath(playerId, chatRoomId);

    for (let argName in args) {
      this.writer.set(
        playerChatRoomMembershipPath.concat([argName]),
        args[argName]);
    }
  }

  addRequestCategory(args) {
    let { requestCategoryId, chatRoomId } = args;
    this.writer.insert(
      this.reader.getRequestCategoryPath(chatRoomId, null),
      null,
      new Model.RequestCategory(requestCategoryId, Utils.merge(args, {
        time: this.getTime_(args),
      })));
  }

  updateRequestCategory(args) {
    let { requestCategoryId } = args;
    let chatRoomId = this.reader.getChatRoomIdForRequestCategoryId(requestCategoryId);
    let requestCategoryPath = this.reader.getRequestCategoryPath(chatRoomId, requestCategoryId);
    for (let argName in args) {
      this.writer.set(requestCategoryPath.concat([argName]), args[argName]);
    }
  }

  addRequest(args) {
    let { requestId, requestCategoryId, playerId } = args;
    let chatRoomId = this.reader.getChatRoomIdForRequestCategoryId(requestCategoryId);
    this.writer.insert(
      this.reader.getRequestPath(chatRoomId, requestCategoryId, null),
      null,
      new Model.Request(requestId, {
        playerId: playerId,
        time: null,
        text: null,
      }));
  }

  addResponse(args) {
    let { requestId, text } = args;
    let requestCategoryId = this.reader.getRequestCategoryIdForRequestId(requestId);
    let chatRoomId = this.reader.getChatRoomIdForMessageId(requestId);
    let requestCategory = this.reader.get(this.reader.getRequestCategoryPath(chatRoomId, requestCategoryId));
    let requestPath = this.reader.getRequestPath(chatRoomId, requestCategoryId, requestId);
    let request = this.reader.get(requestPath);
    if (requestCategory.type == 'ack')
      assert(text === null);
    else if (requestCategory.type == 'text')
      assert(typeof text == 'string' && text);
    else
      throwError('Bad request type');
    this.writer.set(requestPath.concat(["response"]), {
      time: this.getTime_(args),
      text: text
    });
  }

  addMission(args) {
    let { missionId, accessGroupId } = args;
    this.writer.insert(
      this.reader.getMissionPath(null),
      null,
      new Model.Mission(missionId, args));
    this.addMissionMembershipsForAllGroupMembers_(missionId, accessGroupId);
  }

  addMissionMembershipsForAllGroupMembers_(missionId, accessGroupId) {
    let group = this.game.groupsById[accessGroupId];
    for (let playerId of group.players) {
      this.addPlayerToMission_(missionId, playerId);
    }
  }

  removeMissionMembershipsForAllGroupMembers_(missionId, accessGroupId) {
    let group = this.game.groupsById[accessGroupId];
    for (let playerId of group.players) {
      this.removePlayerFromMission_(missionId, playerId);
    }
  }

  updateMission(args) {
    let { missionId } = args;
    let missionPath = this.reader.getMissionPath(missionId);
    let mission = this.game.missionsById[missionId];
    if ('accessGroupId' in args) {
      this.removeMissionMembershipsForAllGroupMembers_(missionId, mission.accessGroupId);
      this.addMissionMembershipsForAllGroupMembers_(missionId, args.accessGroupId);
    }
    for (let argName in args) {
      this.writer.set(missionPath.concat([argName]), args[argName]);
    }
  }
  deleteMission(args) {
    let { missionId } = args;
    let missionPath = this.reader.getMissionPath(missionId);
    let mission = this.game.missionsById[missionId];
    this.removeMissionMembershipsForAllGroupMembers_(missionId, mission.accessGroupId);
    this.writer.remove(
      missionPath.slice(0, missionPath.length - 1),
      missionPath.slice(-1)[0], // index
      missionId);
  }
  addRewardCategory(args) {
    let { rewardCategoryId } = args;
    this.writer.insert(
      this.reader.getRewardCategoryPath(null),
      null,
      new Model.RewardCategory(rewardCategoryId, args));
  }
  updateRewardCategory(args) {
    let { rewardCategoryId } = args;
    let rewardCategoryPath = this.reader.getRewardCategoryPath(rewardCategoryId);
    for (let argName in args) {
      this.writer.set(rewardCategoryPath.concat([argName]), args[argName]);
    }
  }
  queueNotification(args) {
    this.addQueuedNotification(args);
    let millisecondsUntilSend = args.sendTime - this.getTime_(args);
    if (millisecondsUntilSend > 0) {
      setTimeout(
        () => this.executeNotifications(args),
        millisecondsUntilSend);
    } else {
      this.executeNotifications(args);
    }
  }
  executeNotifications(args) {
    let game = this.game;
    for (let queuedNotification of game.queuedNotifications) {
      if (!queuedNotification.sent && (queuedNotification.sendTime == null || queuedNotification.sendTime <= this.getTime_(args))) {
        this.writer.set(this.reader.getQueuedNotificationPath(queuedNotification.id).concat(['sent']), true);

        let playerIds = new Set();
        if (queuedNotification.playerId) {
          playerIds.add(queuedNotification.playerId);
        } else {
          assert(queuedNotification.groupId);
          let group = game.groupsById[queuedNotification.groupId];
          playerIds = new Set(group.players);
        }
        for (let playerId of playerIds) {
          this.sendNotification({
            gameId: queuedNotification.gameId,
            playerId: playerId,
            notificationId: this.idGenerator.newNotificationId(),
            queuedNotificationId: queuedNotification.id,
            message: queuedNotification.message,
            previewMessage: queuedNotification.previewMessage,
            destination: queuedNotification.destination,
            time: this.getTime_(args),
            icon: queuedNotification.icon,
            site: queuedNotification.site,
            mobile: queuedNotification.mobile,
            vibrate: queuedNotification.vibrate,
            sound: queuedNotification.sound,
            email: queuedNotification.email,
          });
        }
      }
    }
  }
  addQueuedNotification(args) {
    let { queuedNotificationId } = args;
    args.sent = false;
    this.writer.insert(
      this.reader.getQueuedNotificationPath(null),
      null,
      new Model.QueuedNotification(queuedNotificationId, args));
  }
  sendNotification(args) {
    let { queuedNotificationId, notificationId, playerId } = args;
    let properties = Utils.copyOf(args);
    properties.seenTime = null;
    properties.queuedNotificationId = queuedNotificationId;
    properties.time = this.getTime_(args);
    this.writer.insert(
      this.reader.getNotificationPath(playerId, null),
      null,
      new Model.Notification(notificationId, properties));
  }
  updateQueuedNotification(args) {
    let { queuedNotificationId } = args;
    let queuedNotificationPath = this.reader.getQueuedNotificationPath(queuedNotificationId);
    for (let argName in args) {
      this.writer.set(queuedNotificationPath.concat([argName]), args[argName]);
    }
  }
  updateNotification(args) {
    let { playerId, notificationId } = args;
    this.writer.set(
      this.reader.getNotificationPath(playerId, notificationId).concat(["seenTime"]),
      this.getTime_(args));
  }
  addReward(args) {
    let { rewardCategoryId, rewardId, code } = args;
    let rewardCategory = this.game.rewardCategoriesById[rewardCategoryId];
    code = code || rewardCategory.shortName + ' ' + rewardCategory.rewards.length;
    this.writer.insert(
      this.reader.getRewardPath(rewardCategoryId, null),
      null,
      new Model.Reward(rewardId, Utils.merge(args, {
        code: code,
        rewardCategoryId: rewardCategoryId,
        playerId: null,
      })));
  }
  addRewards(args) {
    let { rewardCategoryId, count } = args;
    let rewardCategory = this.game.rewardCategoriesById[rewardCategoryId];
    for (let i = 0; i < count; i++) {
      let rewardId = this.idGenerator.newRewardId();
      let code = rewardCategory.shortName + ' ' + rewardCategory.rewards.length;
      this.addReward({
        id: rewardId,
        rewardId: rewardId,
        rewardCategoryId: rewardCategoryId,
        code: code
      });
    }
  }
  addGun(args) {
    let { gunId, label } = args;
    let properties = {
      id: gunId,
      label: label,
      playerId: null,
    };
    this.writer.insert(
      this.reader.getGunPath(null),
      null,
      properties);
  }
  updateGun(args) {
    let { gunId } = args;
    for (let argName in args) {
      this.writer.set(
        this.reader.getGunPath(gunId).concat([argName]),
        args[argName]);
    }
  }
  assignGun(args) {
    let { gunId, playerId } = args;
    let gunPath = this.reader.getGunPath(gunId);
    this.writer.set(gunPath.concat(["playerId"]), playerId);
  }
  claimReward({ playerId, rewardCode }) {
    assert(typeof rewardCode == 'string');
    rewardCode = rewardCode.replace(/\s/g, '').toLowerCase();
    // let playerPath = this.reader.pathForId(playerId);
    // let gamePath = playerPath.slice(0, 2);
    let game = this.game;
    let player = game.playersById[playerId];

    // let rewardCategoriesPath = gamePath.concat(["rewardCategories"]);
    for (let i = 0; i < game.rewardCategories.length; i++) {
      let rewardCategory = game.rewardCategories[i];
      for (let j = 0; j < rewardCategory.rewards.length; j++) {
        let reward = rewardCategory.rewards[j];
        if (reward.code.replace(/\s/g, '').toLowerCase() == rewardCode) {
          if (reward.playerId != null) {
            throw 'This reward has already been claimed!';
          }
          this.writer.set(
            this.reader.getRewardPath(rewardCategory.id, reward.id).concat(["playerId"]),
            playerId);
          this.writer.set(
            this.reader.getPublicPlayerPath(player.id).concat(["points"]),
            player.points + rewardCategory.points);
          this.writer.insert(
            this.reader.getClaimPath(playerId, null),
            null,
            new Model.Claim(this.idGenerator.newClaimId(), {
              rewardCategoryId: rewardCategory.id,
              rewardId: reward.id,
            }));
          return rewardCategory.id;
        }
      }
    }
    throw 'No reward with that code exists!';
  }
  joinResistance(args) {
    let { playerId, lifeId, privateLifeId, lifeCode } = args;
    let publicLifeId = lifeId;

    let player = this.reader.get(this.reader.getPublicPlayerPath(playerId));
    assert(player.allegiance == 'undeclared');

    this.setPlayerAllegiance(playerId, "resistance", false);
    this.addLife(args);
  }
  joinHorde(args) {
    let { playerId } = args;
    this.setPlayerAllegiance(playerId, "horde", true);
  }
  updateMembershipsOnAllegianceChange(playerId) {
    let game = this.game;
    let player = game.playersById[playerId];

    for (let group of this.game.groups) {
      if (group.autoRemove) {
        if (playerId in group.playersById) {
          if (group.allegianceFilter != 'none' && group.allegianceFilter != player.allegiance) {
            this.removePlayerFromGroup({ groupId: group.id, playerToRemoveId: playerId });
          }
        }
      }
    }
    for (let group of this.game.groups) {
      if (group.autoAdd) {
        if (!(playerId in group.playersById)) {
          if (group.allegianceFilter == 'none' || group.allegianceFilter == player.allegiance) {
            this.addPlayerToGroup({ groupId: group.id, playerToAddId: playerId });
          }
        }
      }
    }
  }
  switchGroupOwnership(ownerId, group, game) {
    var highestPointCount = -1;
    var highestPlayer = null;
    for (let playerId of group.players) {
      let player = game.playersById[playerId];
      // Find other player in group with most points. Ties go to the player with lower player #
      if (player.userId != ownerId && (player.points > highestPointCount ||
        (player.points == highestPointCount && player.number < highestPlayer.number))) {
        highestPlayer = player;
        highestPointCount = player.points;
      }
    }
    let groupPath = this.reader.getGroupPath(group.groupId, null);
    if (highestPlayer == null) {
      // If there aren't any other people in the group, then make the owner null
      this.writer.set(groupPath.concat(['ownerPlayerId']), null)
    } else {
      // Otherwise, switch ownership to the highest player
      this.writer.set(groupPath.concat(['ownerPlayerId']), highestPlayer.userId)
    }
  }
  setPlayerAllegiance(playerId, allegiance, canInfect) {
    let oldAllegiance = this.game.playersById[playerId].allegiance;
    let publicPlayerPath = this.reader.getPublicPlayerPath(playerId);
    this.writer.set(publicPlayerPath.concat(["allegiance"]), allegiance);
    let privatePlayerPath = this.reader.getPrivatePlayerPath(playerId);
    this.writer.set(privatePlayerPath.concat(["canInfect"]), canInfect);
    if (allegiance != oldAllegiance)
      this.updateMembershipsOnAllegianceChange(playerId);
  }
  findPlayerByIdOrLifeCode_(playerId, lifeCode) {
    let players = this.reader.get(this.reader.getPublicPlayerPath(null));
    assert(playerId || lifeCode);
    if (playerId) {
      let player = this.reader.get(this.reader.getPublicPlayerPath(playerId));
      if (!player) {
        throw 'No player found with id ' + playerId;
      }
      return player;
    } else {
      for (let i = 0; i < players.length; i++) {
        let player = players[i];
        if (player.lives.length) {
          let life = player.lives[player.lives.length - 1];
          if (life.private.code == lifeCode) {
            return player;
          }
        }
      }
      throw 'No player found with life code ' + lifeCode;
    }
  }
  infect(request) {
    let { infectionId, infectorPlayerId, victimLifeCode, victimPlayerId } = request;

    if (victimLifeCode)
      victimLifeCode = victimLifeCode.trim().replace(/\s+/g, "-").toLowerCase();

    let victimPlayer = this.findPlayerByIdOrLifeCode_(victimPlayerId, victimLifeCode);
    victimPlayerId = victimPlayer.id;

    if (victimPlayer.allegiance == 'undeclared')
      throw 'Cannot infect someone that is undeclared!';

    // Admin infection
    if (infectorPlayerId == null) {
      this.addInfection_(request, infectionId, victimPlayerId, null);
      return null;
    }

    let infectorPlayerPath = this.reader.getPublicPlayerPath(infectorPlayerId);
    let infectorPlayer = this.reader.get(infectorPlayerPath);
    // Normal human (not possessed) trying to infect
    if (victimPlayer.allegiance == 'resistance' &&
      infectorPlayer.private &&
      !infectorPlayer.private.canInfect) {
      if (victimPlayerId == infectorPlayerId) {
        this.addInfection_(request, infectionId, victimPlayerId, null);
        return "self-infection";
      } else {
        throw 'As a human you can only enter your own lifecode.';
        return;
      }
    }
    let normalValidCode = victimPlayer.lives.length > victimPlayer.infections.length;
    var selfInfectedValidCode = false;
    if (victimPlayer.infections.length > 0 &&
      victimPlayer.infections[victimPlayer.infections.length - 1].infectorId == null) {
      selfInfectedValidCode = true;
    }

    if (normalValidCode || selfInfectedValidCode) {
      // Give the infector points
      this.writer.set(
        infectorPlayerPath.concat(["points"]),
        this.reader.get(infectorPlayerPath.concat(["points"])) + this.game.infectPoints);
      let victimPrivatePlayerPath = this.reader.getPrivatePlayerPath(victimPlayer.id);

      if (infectorPlayer.allegiance == 'resistance') { //Possessed human infection
        // Possessed human becomes a zombie
        this.addInfection_(request, this.idGenerator.newInfectionId(), infectorPlayerId, infectorPlayerId);
        // Oddity: if the possessed human has some extra lives, they just become regular human. weird!
        // The victim can now infect
        this.writer.set(victimPrivatePlayerPath.concat(["canInfect"]), true);
      } else { // Normal zombie infection
        if (selfInfectedValidCode) {
          this.updateNullInfector_(victimPlayer.id, infectorPlayerId)
        } else {
          // Add an infection to the victim
          this.addInfection_(request, this.idGenerator.newInfectionId(), victimPlayerId, infectorPlayerId);
        }
      }
    } else {
      throw 'This lifecode was already zombified!';
    }
    return victimPlayer.id;
  }

  updateNullInfector_(victimId, infectorId) {
    // Fill in the missing infector Id
    let victim = this.findPlayerByIdOrLifeCode_(victimId, null /*no lifecode*/);
    let victimInfections = victim.infections;
    victim.infections[victim.infections.length - 1].infectorId = infectorId;
    this.writer.set(
      this.reader.getPublicPlayerPath(victimId).concat(["infections"]),
      victimInfections)
  }

  addInfection_(request, infectionId, victimPlayerId, infectorPlayerId, possession) {
    let victimPlayerPath = this.reader.getPublicPlayerPath(victimPlayerId);
    let victimPlayer = this.reader.get(victimPlayerPath);
    let time = this.getTime_(request);

    let latestTime = 0;
    assert(victimPlayer.lives);
    assert(victimPlayer.infections);
    for (let life of victimPlayer.lives)
      latestTime = Math.max(latestTime, life.time);
    for (let infection of victimPlayer.infections)
      latestTime = Math.max(latestTime, infection.time);
    assert(time > latestTime);

    this.writer.insert(
      victimPlayerPath.concat(["infections"]),
      null,
      new Model.Infection(infectionId, {
        infectorId: infectorPlayerId,
        time: time,
      }));

    if (victimPlayer.infections.length >= victimPlayer.lives.length) {
      this.setPlayerAllegiance(victimPlayerId, "horde", true);
    }
  }

  addLife(request) {
    let { lifeId, privateLifeId, playerId, lifeCode } = request;
    let publicLifeId = lifeId;
    let playerPath = this.reader.getPublicPlayerPath(playerId);
    let player = this.reader.get(playerPath);
    let time = this.getTime_(request);
    lifeCode = lifeCode || "codefor-" + player.name;

    if (player.allegiance == 'undeclared')
      throw 'Cannot add life to someone that is undeclared!';

    let latestTime = 0;
    assert(player.lives);
    assert(player.infections);
    for (let life of player.lives)
      latestTime = Math.max(latestTime, life.time);
    for (let infection of player.infections)
      latestTime = Math.max(latestTime, infection.time);
    if (time < latestTime) {
      throw "Adding a life before the latest life!";
    }

    publicLifeId = publicLifeId || this.idGenerator.newPublicLifeId();
    privateLifeId = privateLifeId || this.idGenerator.newPrivateLifeId();

    let publicLife =
      new Model.PublicLife(publicLifeId, {
        privateLifeId: privateLifeId,
        time: this.getTime_(request),
      });
    publicLife.private =
      new Model.PrivateLife(privateLifeId, {
        code: lifeCode
      });
    this.writer.insert(this.reader.getPublicLifePath(playerId, null), null, publicLife);

    if (player.lives.length > player.infections.length && player.allegiance != 'resistance') {
      this.setPlayerAllegiance(playerId, "resistance", false);
    }
  }

  updateQuizQuestion(args) {
    throwError('Implement!');
  }
  updateQuizAnswer(args) {
    throwError('Implement!');
  }
  addQuizQuestion(args) {
    let { quizQuestionId } = args;
    this.writer.insert(
      this.reader.getQuizQuestionPath(null),
      null,
      new Model.QuizQuestion(quizQuestionId, args));
  }
  addQuizAnswer(args) {
    let { quizAnswerId, quizQuestionId } = args;
    this.writer.insert(
      this.reader.getQuizAnswerPath(quizQuestionId, null),
      null,
      new Model.QuizAnswer(quizAnswerId, args));
  }
}
