/*
 Copyright 2020 Google Inc.

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

/******************************************************************************
 * This class interfaces with the firestore database to send and receive data.
 ******************************************************************************/
class FirestoreOperations {
  db;
  game;

  constructor() {
    let PAGINATION_LIMIT = 25;
    this.db = firebase.firestore();
    this.game = {};
  }

  /**
   * Function that gets all the User's "player" docSnapshots across all games.
   * 
   * @param uid User's Firebase User Id
   */
  getGamesByPlayer(uid) {
    return PlayerPath.PLAYERS_QUERY(this.db).where("userId", "==", uid).get();
    //return await CacheUtils.optimizedGet(PlayerPath.PLAYERS_QUERY(this.db).where("userId", "==", uid));
  }

  /**
  * Function that gets the docSnapshot for the given game.
  *
  * @param gameId gameId of the game to get
  */
  getGameOnce(gameId) {
    return this.getListenableGame(gameId).get();
  }

  getListenableGame(gameId) {
    return GamePath.GAME_DOC_REF(this.db, gameId);
  }

  /**
  * Function that finds the player associated with this game.
  *
  * @param userId userId of the current user
  * @param gameId gameId of the game to get
  */
  getUserPlayer(userId, gameId) {
    return PlayerPath.PLAYER_IN_GAME_QUERY(this.db, userId, gameId).get();
  }

  getPlayerOnce(gameId, playerId) {
    return CacheUtils.optimizedGet(this.getListenablePlayer(gameId, playerId));
  }

  getListenablePlayer(gameId, playerId) {
    return PlayerPath.PLAYER_DOC_REF(this.db, gameId, playerId);
  }

  getAllPlayersOnce(gameId) {
    return PlayerPath.PLAYERS_COLLECTION(this.db, gameId)
      .orderBy(PlayerPath.FIELD__POINTS, "desc")
      .limit(this.PAGINATION_LIMIT)
      .get();
  }

  getGroupOnce(gameId, groupId) {
    return CacheUtils.optimizedGet(this.getListenableGroup(gameId, groupId));
  }

  getListenableGroup(gameId, groupId) {
    return GroupPath.GROUP_DOC_REF(this.db, gameId, groupId);
  }

  getChatRoomOnce(gameId, chatRoomId) {
    return CacheUtils.optimizedGet(this.getListenableChatRoom(gameId, chatRoomId));
  }

  getListenableChatRoom(gameId, chatRoomId) {
    return ChatPath.CHAT_ROOM_DOC_REF(this.db, gameId, chatRoomId);
  }

  getChatRoomMessagesOnce(gameId, chatRoomId) {
    return this.getListenableChatRoomMessages(gameId, chatRoomId).get();
  }

  getListenableChatRoomMessages(gameId, chatRoomId) {
    return ChatPath.MESSAGES_COLLECTION(this.db, gameId, chatRoomId).orderBy(ChatPath.FIELD__MESSAGE_TIMESTAMP);
  }

  sendChatMessage(gameId, messageId, chatRoomId, playerId, message) {
    let dbMessage = {
      senderId: playerId,
      timestamp: firebase.firestore.FieldValue.serverTimestamp(),
      message: message
    }
    return ChatPath.MESSAGES_COLLECTION(this.db, gameId, chatRoomId).doc(messageId).set(dbMessage);
  }

  getMissionOnce(gameId, missionId) {
    return CacheUtils.optimizedGet(this.getListenableMission(gameId, missionId));
  }

  getListenableMission(gameId, missionId) {
    return MissionPath.MISSION_DOC_REF(this.db, gameId, missionId);
  }

  getAllGroupsPlayerIsMemberOf(gameId, playerId) {
    return GroupPath.GROUPS_COLLECTION(this.db, gameId).where(GroupPath.FIELD__MEMBERS, "array-contains", playerId).get();
  }

  /** 
   * Gets all the missions in the game that are associated with the given group ids.
   * Optionally can take in a limit and will only return the latest <limit> number of missions.
   * Use -1 or leave the limit off to query all the relevant missions.
   */
  getMissionsFromGroups(gameId, groupIdList, limit = -1) {
    if (limit > 0) {
      return MissionPath.MISSION_COLLECTION(this.db, gameId)
        .where(MissionPath.FIELD__GROUP_ID, "in", groupIdList)
        .orderBy(MissionPath.FIELD__END_TIME, "desc")
        .limit(limit)
        .get();
    } else {
      return MissionPath.MISSION_COLLECTION(this.db, gameId)
        .where(MissionPath.FIELD__GROUP_ID, "in", groupIdList)
        .orderBy(MissionPath.FIELD__END_TIME, "desc")
        .get();
    }
  }

  getRewardOnce(gameId, rewardId) {
    return CacheUtils.optimizedGet(this.getListenableReward(gameId, rewardId));
  }

  getListenableReward(gameId, rewardId) {
    return RewardPath.REWARD_DOC_REF(this.db, gameId, rewardId);
  }

  getAllRewards(gameId) {
    return RewardPath.REWARD_COLLECTION(this.db, gameId).get();
  }

  updateGameRules(gameId, updatedRulesArray, successCallback, onErrorCallback) {
    GamePath.GAME_DOC_REF(this.db, gameId).update(GamePath.FIELD__RULES, updatedRulesArray)
      .then(() => {
        if (successCallback) {
          successCallback();
        }
      })
      .catch((error) => {
        Log.e(TAG, "Failed to update game: " + error.message);
        if (onErrorCallback) {
          onErrorCallback();
        }
      });
  }

  updateGameFaq(gameId, updatedFaqArray, successCallback, onErrorCallback) {
    GamePath.GAME_DOC_REF(this.db, gameId).update(GamePath.FIELD__FAQ, updatedFaqArray)
      .then(() => {
        if (successCallback) {
          successCallback();
        }
      })
      .catch((error) => {
        Log.e(TAG, "Failed to update game: " + error.message);
        if (onErrorCallback) {
          onErrorCallback();
        }
      });
  }

  addQuizQuestion(gameId, quizQuestion, successCallback, onErrorCallback) {
    return QuizPath.QUIZ_QUESTION_COLLECTION(this.db, gameId).add(quizQuestion).then(() => {
      if (successCallback) {
        successCallback();
      }
    })
      .catch((error) => {
        Log.e(TAG, "Failed to add quiz question: " + error.message);
        if (onErrorCallback) {
          onErrorCallback();
        }
      });
  }

  updateQuizQuestion(gameId, draftQuizQuestion, successCallback, onErrorCallback) {
    return QuizPath.QUIZ_QUESTION_DOC_REF(this.db, gameId, draftQuizQuestion.id).set(quizQuestion).then(() => {
      if (successCallback) {
        successCallback();
      }
    })
      .catch((error) => {
        Log.e(TAG, "Failed to update quiz question: " + error.message);
        if (onErrorCallback) {
          onErrorCallback();
        }
      });;
  }

  getListenableQuizQuestions(gameId) {
    return QuizPath.QUIZ_QUESTION_COLLECTION(this.db, gameId).orderBy(QuizPath.FIELD__INDEX);
  }

  updatePlayerChatSettings(gameId, playerId, chatRoomId, fieldAndValue, successCallback, onErrorCallback) {
    let chatPath = PlayerPath.FIELD__CHAT_MEMBERSHIPS + "." + chatRoomId + "." + fieldAndValue.field;
    PlayerPath.PLAYER_DOC_REF(this.db, gameId, playerId).update(chatPath, fieldAndValue.value)
      .then(() => {
        if (successCallback) {
          successCallback();
        }
      })
      .catch((error) => {
        Log.e(TAG, "Failed to update player chat settings: " + error.message);
        if (onErrorCallback) {
          onErrorCallback();
        }
      });
  }

  async getPlayerList(gameId, nameFilter, allegianceFilter, callback) {
    if (!nameFilter && !allegianceFilter) {
      return PlayerPath.PLAYERS_COLLECTION(this.db, gameId)
        .orderBy(PlayerPath.FIELD__NAME)
        .limit(this.PAGINATION_LIMIT)
        .get()
        .then(serverPlayerSnapshots => {
          if (!serverPlayerSnapshots || serverPlayerSnapshots.empty) {
            return [];
          }
          let playerList = new Array();
          for (let doc of serverPlayerSnapshots.docs) {
            playerList.push(DataConverterUtils.convertSnapshotToPlayer(doc));
          }
          return playerList;
        });
    } else if (!nameFilter && allegianceFilter) {
      return PlayerPath.PLAYERS_COLLECTION(this.db, gameId)
        .orderBy(PlayerPath.FIELD__NAME)
        .where(GroupPath.FIELD__SETTINGS_ALLEGIANCE_FILTER, "==", allegianceFilter)
        .limit(this.PAGINATION_LIMIT)
        .get()
        .then(serverPlayerSnapshots => {
          if (!serverPlayerSnapshots || serverPlayerSnapshots.empty) {
            return [];
          }
          let playerList = new Array();
          for (let doc of serverPlayerSnapshots.docs) {
            playerList.push(DataConverterUtils.convertSnapshotToPlayer(doc));
          }
          return playerList;
        });
    } else if (nameFilter && !allegianceFilter) {
      return PlayerPath.PLAYERS_COLLECTION(this.db, gameId)
        .orderBy(PlayerPath.FIELD__NAME)
        .startAt(nameFilter)
        .endAt(nameFilter + "\uf8ff") // '\uf8ff' is super large char val
        .limit(this.PAGINATION_LIMIT)
        .get()
        .then(serverPlayerSnapshots => {
          if (!serverPlayerSnapshots || serverPlayerSnapshots.empty) {
            return [];
          }
          let playerList = new Array();
          for (let doc of serverPlayerSnapshots.docs) {
            playerList.push(DataConverterUtils.convertSnapshotToPlayer(doc));
          }
          return playerList;
        });
    } else if (nameFilter && allegianceFilter) {
      return PlayerPath.PLAYERS_COLLECTION(this.db, gameId)
        .where(GroupPath.FIELD__SETTINGS_ALLEGIANCE_FILTER, "==", allegianceFilter)
        .orderBy(PlayerPath.FIELD__NAME)
        .startAt(nameFilter)
        .endAt(nameFilter + "\uf8ff") // '\uf8ff' is super large char val
        .limit(this.PAGINATION_LIMIT)
        .get()
        .then(serverPlayerSnapshots => {
          if (!serverPlayerSnapshots || serverPlayerSnapshots.empty) {
            return [];
          }
          let playerList = new Array();
          for (let doc of serverPlayerSnapshots.docs) {
            playerList.push(DataConverterUtils.convertSnapshotToPlayer(doc));
          }
          return playerList;
        });
    }

  }

  async getPlayerListInGroup(gameId, group) {
    if (!group) {
      return [];
    }
    return PlayerPath.PLAYERS_COLLECTION(this.db, gameId)
      .where(firebase.firestore.FieldPath.documentId(), "in", group.members)
      .orderBy(PlayerPath.FIELD__NAME)
      .limit(this.PAGINATION_LIMIT)
      .get()
      .then(serverPlayerSnapshots => {
        if (!serverPlayerSnapshots || serverPlayerSnapshots.empty) {
          return [];
        }
        let playerList = new Array();
        for (let doc of serverPlayerSnapshots.docs) {
          playerList.push(DataConverterUtils.convertSnapshotToPlayer(doc));
        }
        return playerList;
      });
  }
}
