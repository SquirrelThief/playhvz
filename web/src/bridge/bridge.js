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
 * This is the parent class that defines the API for network/database calls. There 
 * are two implementations, one for the fake server and one for the real server.
 */

// ? means this value is nullable
// | means this value is optional
// ! means this value shouldn't exist already

'use strict';

class Bridge {
  constructor(idGenerator, inner) {
    this.inner = inner;
    this.firestoreOperations = new FirestoreOperations();
    this.idGenerator = idGenerator;

    this.requestTimeOffset = null;

    for (let [method, expectations] of Bridge.METHODS_MAP) {
      this[method] =
        (args) => {
          args = Utils.copyOf(args);
          if (this.requestTimeOffset != null)
            args.requestTimeOffset = this.requestTimeOffset;
          new Utils.Validator(expectations, this.check_.bind(this)).validate(args);
          assert(this.inner[method]);
          return this.inner[method](args);
        };
    }

    for (let methodName of Utils.getAllFuncNames(idGenerator)) {
      this[methodName] = (...args) => this.idGenerator[methodName](...args);
    }
  }

  setRequestTimeOffset(requestTimeOffset) {
    // Must be in the past
    assert(requestTimeOffset <= 0);

    if (this.requestTimeOffset == null) {
      this.requestTimeOffset = requestTimeOffset;
    } else {
      // Must always be coming closer to the present
      assert(this.requestTimeOffset <= requestTimeOffset);

      this.requestTimeOffset = requestTimeOffset;
    }
  }

  getSignedInUserId() {
    return this.inner.getSignedInUserId();
  }

  async signIn(...args) {
    return this.inner.signIn(...args);
  }
  async signOut(...args) {
    return this.inner.signOut(...args);
  }
  async getSignedInPromise(...args) {
    return this.inner.getSignedInPromise(...args);
  }
  async setPlayerId(playerId) {
    return this.inner.setPlayerId(playerId);
  }

  setAuthChangeCallback(authChangedCallback) {
    return this.inner.setAuthChangeCallback(authChangedCallback);
  }

  //////////////////////////////////////////////////////////////////////
  // Start of new Firestore supporting functions.
  //////////////////////////////////////////////////////////////////////
  /* Creates the game and returns the game id if it succeeded. */
  async createGame(creatorUserId, name, startTime, endTime) {
    var createGame = firebase.functions().httpsCallable("createGame");
    return await createGame({
      creatorUserId: creatorUserId, name: name, startTime: startTime, endTime: endTime
    }).then(
      result => { return result.data; }
    ).catch(error => {
      console.log("Warning: " + error.message + ", doing nothing.");
      return null;
    });
  }

  async checkGameExists(gameName) {
    var exists = firebase.functions().httpsCallable("checkGameExists");
    return await exists({ name: gameName }).then(
      result => { return result.data; }
    ).catch(error => {
      console.log("Warning: " + error.message + ", doing nothing.");
      return null;
    });
  }

  /** Returns an array of Game objects. */
  async getGameList(userId) {
    // Get all the game ids for which this user has a player, then
    // get all of those games.
    return this.firestoreOperations.getGamesByPlayer(userId).then(querySnapshot => {
      let gameDocSnapshotPromises = [];
      for (let doc of querySnapshot.docs) {
        const gameId = doc.ref.parent.parent.id
        const promise = this.getGameOnce(gameId)
        gameDocSnapshotPromises.push(promise);
      }
      // Once we have all the game docs, we can now render the data.
      return Promise.all(gameDocSnapshotPromises).then(snapshots => {
        let gameArray = []
        for (let gameSnapshot of snapshots) {
          if (gameSnapshot) {
            gameArray.push(gameSnapshot);
          }
        }
        return gameArray;
      });
    });
  }

  /* Returns a current snapshot of the game, converted to an object js understands. */
  async getGameOnce(gameId) {
    return this.firestoreOperations.getGameOnce(gameId).then(docSnapshot => {
      if (!docSnapshot.exists) {
        return null
      }
      return DataConverterUtils.convertSnapshotToGame(docSnapshot);
    });
  }

  listenToGame(gameId, callback) {
    this.firestoreOperations.getListenableGame(gameId).onSnapshot(docSnapshot => {
      let game = null;
      if (docSnapshot.exists) {
        game = DataConverterUtils.convertSnapshotToGame(docSnapshot);
      }
      callback(game);
    });
  }

  async joinGame(gameName, playerName, callback = null) {
    var joinGame = firebase.functions().httpsCallable("joinGame");
    await joinGame({ gameName: gameName, playerName: playerName }).then((result) => {
      console.log("Joined: " + result.data)
      var gameId = result.data;
      if (callback != null) {
        callback(gameId);
      }
    })
      .catch(error => console.log("Error: " + error.message));
  }

  async getPlayer(userId, gameId) {
    return this.firestoreOperations.getUserPlayer(userId, gameId).then(querySnapshot => {
      if (querySnapshot.docs.length > 1) {
        return null
      }
      return DataConverterUtils.convertSnapshotToPlayer(querySnapshot.docs[0]);
    });
  }

  async getPlayerOnce(gameId, playerId) {
    return this.firestoreOperations.getPlayerOnce(gameId, playerId).then(docSnapshot => {
      if (docSnapshot == undefined || !docSnapshot.exists) {
        return null;
      }
      return DataConverterUtils.convertSnapshotToPlayer(docSnapshot);
    });
  }

  listenToPlayer(gameId, playerId, callback) {
    this.firestoreOperations.getListenablePlayer(gameId, playerId).onSnapshot(docSnapshot => {
      let player = null;
      if (docSnapshot.exists) {
        player = DataConverterUtils.convertSnapshotToPlayer(docSnapshot);
      }
      callback(player)
    });
  }

  getPlayersInGroup(gameId, group) {
    let playerDocSnapshotPromises = [];
    for (let playerId of group.members) {
      const promise = this.getPlayerOnce(gameId, playerId);
      playerDocSnapshotPromises.push(promise);
    }
    // Once we have all the player docs, we can now render the data.
    return Promise.all(playerDocSnapshotPromises).then(snapshots => {
      let playerMap = {}
      for (let playerSnapshot of snapshots) {
        if (playerSnapshot) {
          playerMap[playerSnapshot.id] = playerSnapshot;
        }
      }
      return playerMap;
    });
  }

  listenToGroup(gameId, groupId, callback) {
    return this.firestoreOperations.getListenableGroup(gameId, groupId).onSnapshot(docSnapshot => {
      let group = null;
      if (docSnapshot.exists) {
        group = DataConverterUtils.convertSnapshotToGroup(docSnapshot);
      }
      callback(group);
    });
  }

  listenToChatRoom(gameId, chatRoomId, callback, onErrorCallback = null) {
    return this.firestoreOperations.getListenableChatRoom(gameId, chatRoomId)
      .onSnapshot(docSnapshot => {
        let chatRoom = null;
        if (docSnapshot.exists) {
          chatRoom = DataConverterUtils.convertSnapshotToChatRoom(docSnapshot);
        }
        callback(chatRoom);
      }, (error) => {
        if (onErrorCallback != null) {
          onErrorCallback();
        }
      });
  }

  listenToChatRoomMessages(gameId, chatRoomId, callback) {
    return this.firestoreOperations.getListenableChatRoomMessages(gameId, chatRoomId).onSnapshot(querySnapshot => {
      let messageArray = [];
      for (let doc of querySnapshot.docs) {
        let message = DataConverterUtils.convertSnapshotToMessage(doc);
        if (message != null) {
          messageArray.push(message);
        }
      }
      callback(messageArray);
    });
  }

  async sendChatMessage(gameId, messageId, chatRoomId, playerId, message) {
    return this.firestoreOperations.sendChatMessage(gameId, messageId, chatRoomId, playerId, message);
  }


  listenToLastMission(gameId, playerId, callback) {
    /*// Get all the group ids that are related to missions.
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
    return playerMissions[playerMissions.length - 1]*/
    return null;
  }




  changePlayerAllegiance(gameId, playerId, newAllegiance) {
    return this.inner.changePlayerAllegiance(gameId, playerId, newAllegiance)
  }

  addPlayersToGroup(gameId, groupId, playerIdList) {
    return this.inner.addPlayersToGroup(gameId, groupId, playerIdList)
  }

  infectPlayerByLifeCode(gameId, infectorPlayerId, victimLifeCode) {
    return this.inner.infectPlayerByLifeCode(gameId, infectorPlayerId, victimLifeCode);
  }

  listenToReward(gameId, rewardId, callback) {
    return this.inner.listenToReward(gameId, rewardId, callback);
  }

  createChatRoom(gameId, ownerId, chatName, allegianceFilter) {
    return this.inner.createChatRoom(gameId, ownerId, chatName, allegianceFilter);
  }

  createOrGetChatWithAdmin(gameId, playerId) {
    return this.inner.createOrGetChatWithAdmin(gameId, playerId);
  }

  addPlayersToChat(gameId, groupId, chatRoomId, playerIdList) {
    return this.inner.addPlayersToChat(gameId, groupId, chatRoomId, playerIdList);
  }

  createMission(gameId, missionName, startTime, endTime, details, allegianceFilter) {
    return this.inner.createMission(gameId, missionName, startTime, endTime, details, allegianceFilter);
  }


  listenToMission(gameId, missionId, callback) {
    return this.inner.listenToMission(gameId, missionId, callback);
  }

  listenToMissionList(gameId, playerId, callback) {
    return this.inner.listenToMissionList(gameId, playerId, callback);
  }

  createReward(gameId, shortName, longName, description, imageUrl, points) {
    return this.inner.createReward(gameId, shortName, longName, description, imageUrl, points);
  }

  generateClaimCodes(gameId, rewardId, numCodes) {
    return this.inner.generateClaimCodes(gameId, rewardId, numCodes);
  }

  redeemRewardCode(gameId, playerId, claimCode) {
    return this.inner.redeemRewardCode(gameId, playerId, claimCode);
  }
  //////////////////////////////////////////////////////////////////////
  // End of new Firestore supporting functions.
  //////////////////////////////////////////////////////////////////////

  //////////////////////////////////////////////////////////////////////
  // Start dev supporting functions. These should crash if tried by prod.
  //////////////////////////////////////////////////////////////////////

  async getAllChatsInGame(gameId) {
    return this.inner.getAllChatsInGame(gameId);
  }

  //////////////////////////////////////////////////////////////////////
  // End dev supporting functions.
  //////////////////////////////////////////////////////////////////////


  check_(typeName, value) {
    if (typeName.startsWith('!'))
      typeName = typeName.slice(1);
    assert(('verify' + typeName) in this.idGenerator);
    assert(value);

    // Such as Bridge.UserId.verify
    this.idGenerator['verify' + typeName](value);
  }
}

class IdGenerator {
  generateId(type, note) { return Utils.generateId(type, note); }
  verify(type, id) { return id == null || (typeof id == 'string' && id.startsWith(type + '-')); }

  newChatRoomId(note) { return this.generateId('chatRoom', note); }
  verifyChatRoomId(id) { return this.verify('chatRoom', id); }
  newClaimId(note, playerId) { return this.generateId(note, playerId); }
  verifyClaimId(id) { return this.verify('claim', id); }
  newDefaultProfileImageId(note) { return this.generateId('defaultProfileImage', note); }
  verifyDefaultProfileImageId(id) { return this.verify('defaultProfileImage', id); }
  newGameId(note) { return this.generateId('game', note); }
  verifyGameId(id) { return this.verify('game', id); }
  newGroupId(note) { return this.generateId('group', note); }
  verifyGroupId(id) { return this.verify('group', id); }
  newGunId(note) { return this.generateId('gun', note); }
  verifyGunId(id) { return this.verify('gun', id); }
  newInfectionId(note) { return this.generateId('infection', note); }
  verifyInfectionId(id) { return this.verify('infection', id); }
  newPublicLifeId(note) { return this.generateId('publicLife', note); }
  verifyPublicLifeId(id) { return this.verify('publicLife', id); }
  newPrivateLifeId(note) { return this.generateId('privateLife', note); }
  verifyPrivateLifeId(id) { return this.verify('privateLife', id); }
  newMapId(note) { return this.generateId('map', note); }
  verifyMapId(id) { return this.verify('map', id); }
  newMembershipId(note) { return this.generateId('membership', note); }
  verifyMembershipId(id) { return this.verify('membership', id); }
  newMessageId(note) { return this.generateId('message', note); }
  verifyMessageId(id) { return this.verify('message', id); }
  newMissionId(note) { return this.generateId('mission', note); }
  verifyMissionId(id) { return this.verify('mission', id); }
  newQueuedNotificationId(note) { return this.generateId('queuedNotification', note); }
  verifyQueuedNotificationId(id) { return this.verify('queuedNotification', id); }
  newNotificationId(note) { return this.generateId('notification', note); }
  verifyNotificationId(id) { return this.verify('notification', id); }
  newPublicPlayerId(note) { return this.generateId('publicPlayer', note); }
  verifyPublicPlayerId(id) { return this.verify('publicPlayer', id); }
  newPrivatePlayerId(note) { return this.generateId('privatePlayer', note); }
  verifyPrivatePlayerId(id) { return this.verify('privatePlayer', id); }
  newMarkerId(note) { return this.generateId('marker', note); }
  verifyMarkerId(id) { return this.verify('marker', id); }
  newQuizAnswerId(note) { return this.generateId('quizAnswer', note); }
  verifyQuizAnswerId(id) { return this.verify('quizAnswer', id); }
  newQuizQuestionId(note) { return this.generateId('quizQuestion', note); }
  verifyQuizQuestionId(id) { return this.verify('quizQuestion', id); }
  newRequestId(note) { return this.generateId('request', note); }
  verifyRequestId(id) { return this.verify('request', id); }
  newRequestCategoryId(note) { return this.generateId('requestCategory', note); }
  verifyRequestCategoryId(id) { return this.verify('requestCategory', id); }
  newRewardCategoryId(note) { return this.generateId('rewardCategory', note); }
  verifyRewardCategoryId(id) { return this.verify('rewardCategory', id); }
  newRewardId(note) { return this.generateId('reward', note); }
  verifyRewardId(id) { return this.verify('reward', id); }
  newUserId(note) { return this.generateId('user', note); }
  verifyUserId(id) { return this.verify('user', id); }
}

class FakeIdGenerator extends IdGenerator {
  constructor() {
    super();
    this.idsByType = {};
  }

  generateId(type, note) {
    if (!(type in this.idsByType)) {
      this.idsByType[type] = 1;
    }
    let result = type + "-";
    if (note)
      result += note + "-";
    result += this.idsByType[type]++;
    return result;
  }
}

// Sets Bridge.METHODS_MAP and Bridge.serverMethods
(function () {
  let optional = Utils.Validator.optional;

  let serverMethods = new Map();

  // Users
  serverMethods.set('register', {
    userId: 'String'
  });

  // Guns
  /*serverMethods.set('addGun', {
    gameId: 'GameId',
    gunId: '!GunId',
    label: 'String',
  });
  serverMethods.set('updateGun', {
    gameId: 'GameId',
    gunId: 'GunId',
    label: '|String',
  });
  serverMethods.set('assignGun', {
    gameId: 'GameId',
    gunId: 'GunId',
    playerId: '?PublicPlayerId',
  }); */

  // Games
  /*serverMethods.set('createGame', {
    gameId: '!GameId',
    creatorUserId: 'UserId',
    name: 'String',
    /*rulesHtml: 'String',
    faqHtml: 'String',
    summaryHtml: 'String',
    stunTimer: 'Number',
    infectPoints: 'Number',
    isActive: 'Boolean', *
    startTime: 'Timestamp',
    endTime: 'Timestamp',
    /*registrationEndTime: 'Timestamp',
    declareResistanceEndTime: 'Timestamp',
    declareHordeEndTime: 'Timestamp', *
  }); */
  serverMethods.set('updateGame', {
    gameId: 'GameId',
    adminOnCallPlayerId: "String",
    name: '|String',
    /*rulesHtml: '|String',
    faqHtml: '|String',
    summaryHtml: '|String',
    stunTimer: '|Number',
    infectPoints: '|Number',
    isActive: '|Boolean', */
    startTime: '|Timestamp',
    endTime: '|Timestamp',
    /*registrationEndTime: '|Timestamp',
    declareResistanceEndTime: '|Timestamp',
    declareHordeEndTime: '|Timestamp', */
  });
  serverMethods.set('setAdminContact', {
    gameId: 'GameId',
    playerId: 'PublicPlayerId',
  });
  serverMethods.set('addDefaultProfileImage', {
    gameId: 'GameId',
    defaultProfileImageId: '!DefaultProfileImageId',
    allegianceFilter: 'String',
    profileImageUrl: 'String',
  });

  // Players
  serverMethods.set('createPlayer', {
    playerId: '!PublicPlayerId',
    userId: 'UserId',
    gameId: 'GameId',
    name: 'String',
    allegiance: 'String',
    avatarUrl: 'String',
    points: 'Number',
    /*needGun: 'Boolean',
    canInfect: 'Boolean',
    profileImageUrl: 'String',
    wantToBeSecretZombie: 'Boolean',
    beInPhotos: 'Boolean',
    volunteer: {
      advertising: 'Boolean',
      logistics: 'Boolean',
      communications: 'Boolean',
      moderator: 'Boolean',
      cleric: 'Boolean',
      sorcerer: 'Boolean',
      admin: 'Boolean',
      photographer: 'Boolean',
      chronicler: 'Boolean',
      server: 'Boolean',
      android: 'Boolean',
      ios: 'Boolean',
      client: 'Boolean',
    },
    notificationSettings: {
      vibrate: 'Boolean',
      sound: 'Boolean',
    },
    isActive: 'Boolean',
    gotEquipment: 'Boolean',
    notes: 'String', */
  });
  serverMethods.set('updatePlayer', {
    playerId: 'PublicPlayerId',
    gameId: 'GameId',
    name: '|String',
    allegiance: '|String',
    avatarUrl: '|String',
    /*needGun: '|Boolean',
    canInfect: '|Boolean',
    profileImageUrl: '|String',
    wantToBeSecretZombie: '|Boolean',
    beInPhotos: '|Boolean',
    volunteer: optional({
      advertising: '|Boolean',
      logistics: '|Boolean',
      communications: '|Boolean',
      moderator: '|Boolean',
      cleric: '|Boolean',
      sorcerer: '|Boolean',
      admin: '|Boolean',
      photographer: '|Boolean',
      chronicler: '|Boolean',
      server: '|Boolean',
      android: '|Boolean',
      ios: '|Boolean',
      client: '|Boolean',
    }),
    notificationSettings: optional({
      vibrate: '|Boolean',
      sound: '|Boolean',
    }),
    isActive: '|Boolean',
    gotEquipment: '|Boolean',
    notes: '|String', */
  });


  serverMethods.set('addMission', {
    missionId: '!MissionId',
    accessGroupId: 'GroupId',
    rsvpersGroupId: 'GroupId',
    gameId: 'GameId',
    beginTime: 'Timestamp',
    endTime: 'Timestamp',
    name: 'String',
    detailsHtml: 'String',
  });
  serverMethods.set('updateMission', {
    missionId: 'MissionId',
    gameId: 'GameId',
    accessGroupId: '|GroupId',
    beginTime: '|Timestamp',
    endTime: '|Timestamp',
    name: '|String',
    detailsHtml: '|String',
  });
  serverMethods.set('deleteMission', {
    gameId: 'GameId',
    missionId: 'MissionId',
  });

  serverMethods.set('createGroup', {
    groupId: '!GroupId',
    gameId: 'GameId',
    name: 'String',
    allegianceFilter: 'String',
    ownerPlayerId: '?PublicPlayerId',
    autoAdd: 'Boolean',
    autoRemove: 'Boolean',
    canAddOthers: 'Boolean',
    canRemoveOthers: 'Boolean',
    canAddSelf: 'Boolean',
    canRemoveSelf: 'Boolean',
  });
  serverMethods.set('updateGroup', {
    gameId: 'GameId',
    groupId: 'GroupId',
    name: '|String',
    allegianceFilter: '|String',
    ownerPlayerId: '|?PublicPlayerId',
    autoAdd: '|Boolean',
    autoRemove: '|Boolean',
    canAddOthers: '|Boolean',
    canRemoveOthers: '|Boolean',
    canAddSelf: '|Boolean',
    canRemoveSelf: '|Boolean',
  });

  serverMethods.set('addRewardCategory', {
    rewardCategoryId: '!RewardCategoryId',
    gameId: 'GameId',
    name: 'String',
    points: 'Number',
    badgeImageUrl: '?String',
    shortName: 'String',
    description: 'String',
    limitPerPlayer: 'Number',
  });
  serverMethods.set('updateRewardCategory', {
    rewardCategoryId: 'RewardCategoryId',
    gameId: 'GameId',
    name: '|String',
    points: '|Number',
    badgeImageUrl: '|?String',
    shortName: '|String',
    description: '|String',
    limitPerPlayer: '|Number',
  });

  serverMethods.set('addReward', {
    gameId: 'GameId',
    rewardId: '!RewardId',
    rewardCategoryId: 'RewardCategoryId',
    code: '?String',
  });

  serverMethods.set('addRewards', {
    gameId: 'GameId',
    rewardCategoryId: 'RewardCategoryId',
    count: 'Number',
  });

  serverMethods.set('claimReward', {
    gameId: 'GameId',
    playerId: 'PublicPlayerId',
    rewardCode: 'String',
  });

  serverMethods.set('updateChatRoom', {
    chatRoomId: 'ChatRoomId',
    gameId: 'GameId',
    name: '|String',
    withAdmins: '|Boolean',
  });
  serverMethods.set('updateChatRoomMembership', {
    gameId: 'GameId',
    chatRoomId: 'ChatRoomId',
    actingPlayerId: 'PublicPlayerId',
    lastHiddenTime: '|?Timestamp',
    lastSeenTime: '|?Timestamp',
  });

  serverMethods.set('createMap', {
    gameId: 'GameId',
    mapId: '!MapId',
    accessGroupId: 'GroupId',
    name: 'String',
    requestTrackingUntil: 'Timestamp',
  });
  serverMethods.set('updateMap', {
    gameId: 'GameId',
    mapId: 'MapId',
    name: '|String',
    requestTrackingUntil: '|Timestamp',
  });

  serverMethods.set('addMarker', {
    markerId: '!MarkerId',
    mapId: 'MapId',
    gameId: 'GameId',
    name: 'String',
    playerId: '?PublicPlayerId',
    color: 'String',
    latitude: 'Number',
    longitude: 'Number',
  });

  serverMethods.set('addPlayerToGroup', {
    gameId: 'GameId',
    groupId: 'GroupId',
    playerToAddId: 'PublicPlayerId',
    actingPlayerId: '?PublicPlayerId',
  });

  serverMethods.set('removePlayerFromGroup', {
    gameId: 'GameId',
    groupId: 'GroupId',
    playerToRemoveId: 'PublicPlayerId',
    actingPlayerId: '?PublicPlayerId',
  });

  serverMethods.set('addAdmin', {
    gameId: 'GameId',
    userId: 'UserId',
  });

  serverMethods.set('joinHorde', {
    gameId: 'GameId',
    playerId: 'PublicPlayerId'
  });
  serverMethods.set('joinResistance', {
    gameId: 'GameId',
    playerId: 'PublicPlayerId',
    lifeCode: '?String',
    lifeId: '?!PublicLifeId',
    privateLifeId: '?!PrivateLifeId',
  });

  /*serverMethods.set('sendChatMessage', {
    gameId: 'GameId',
    messageId: '!MessageId',
    chatRoomId: 'ChatRoomId',
    playerId: 'PublicPlayerId',
    message: '|String',
    location: optional({
      latitude: 'Number',
      longitude: 'Number',
    }),
  });*/

  serverMethods.set('addRequestCategory', {
    gameId: 'GameId',
    requestCategoryId: '!RequestCategoryId',
    chatRoomId: 'ChatRoomId',
    playerId: 'PublicPlayerId',
    text: 'String',
    type: 'String',
    dismissed: 'Boolean',
  });

  serverMethods.set('updateRequestCategory', {
    gameId: 'GameId',
    requestCategoryId: 'RequestCategoryId',
    text: '|String',
    dismissed: '|Boolean',
  });

  serverMethods.set('addRequest', {
    gameId: 'GameId',
    requestCategoryId: 'RequestCategoryId',
    requestId: '!RequestId',
    playerId: 'PublicPlayerId',
  });

  serverMethods.set('addResponse', {
    gameId: 'GameId',
    requestId: 'RequestId',
    text: '?String',
  });

  serverMethods.set('addLife', {
    gameId: 'GameId',
    playerId: 'PublicPlayerId',
    lifeId: '!PublicLifeId',
    privateLifeId: '?!PrivateLifeId',
    lifeCode: '?String',
  });

  /* serverMethods.set('infect', {
     gameId: 'GameId',
     infectionId: '!InfectionId',
     infectorPlayerId: '?PublicPlayerId',
     victimLifeCode: '?String',
     victimPlayerId: '?PublicPlayerId',
   });*/

  serverMethods.set('queueNotification', {
    gameId: 'GameId',
    queuedNotificationId: '!QueuedNotificationId',
    message: 'String',
    previewMessage: 'String',
    site: 'Boolean',
    mobile: 'Boolean',
    vibrate: 'Boolean',
    sound: '?String',
    email: 'Boolean',
    destination: '?String',
    sendTime: '?Timestamp',
    playerId: '?PublicPlayerId',
    groupId: '?GroupId',
    icon: '?String',
  });

  serverMethods.set('updateQueuedNotification', {
    gameId: 'GameId',
    queuedNotificationId: 'QueuedNotificationId',
    message: '|String',
    previewMessage: '|String',
    site: '|Boolean',
    mobile: '|Boolean',
    vibrate: '|Boolean',
    sound: '|?String',
    email: '|Boolean',
    destination: '|String',
    sendTime: '|?Timestamp',
    playerId: '|?PublicPlayerId',
    groupId: '|?GroupId',
    icon: '|?String',
  });

  serverMethods.set('sendNotification', {
    gameId: 'GameId',
    notificationId: '!NotificationId',
    message: 'String',
    previewMessage: 'String',
    site: 'Boolean',
    mobile: 'Boolean',
    vibrate: 'Boolean',
    sound: '?String',
    email: 'Boolean',
    destination: '?String',
    playerId: '?PublicPlayerId',
    icon: '?String',
  });

  serverMethods.set('addQuizQuestion', {
    quizQuestionId: '!QuizQuestionId',
    gameId: 'GameId',
    text: 'String',
    type: 'String',
    number: 'Number',
  });
  serverMethods.set('updateQuizQuestion', {
    quizQuestionId: 'QuizQuestionId',
    gameId: 'GameId',
    text: '|String',
    type: '|String',
    number: '|Number',
  });

  serverMethods.set('addQuizAnswer', {
    gameId: 'GameId',
    quizAnswerId: '!QuizAnswerId',
    quizQuestionId: 'QuizQuestionId',
    text: 'String',
    order: 'Number',
    isCorrect: 'Boolean',
    number: 'Number',
  });
  serverMethods.set('updateQuizAnswer', {
    gameId: 'GameId',
    quizAnswerId: 'QuizAnswerId',
    text: '|String',
    order: '|Number',
    isCorrect: '|Boolean',
    number: '|Number',
  });

  serverMethods.set('updateNotification', {
    gameId: 'GameId',
    playerId: 'PublicPlayerId',
    notificationId: 'NotificationId',
    seenTime: '|Timestamp',
  });

  serverMethods.set('executeNotifications', {
  });

  for (let [name, expectations] of serverMethods) {
    serverMethods.set(name, Utils.merge(expectations, {
      requestTimeOffset: '|Number',
    }));
  }

  Bridge.METHODS_MAP = serverMethods;
  Bridge.METHODS = Array.from(serverMethods.keys());
})();
