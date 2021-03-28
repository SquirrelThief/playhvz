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
    return ChatPath.MESSAGES_COLLECTION(this.db, gameId, chatRoomId).orderBy("timestamp");
  }

  sendChatMessage(gameId, messageId, chatRoomId, playerId, message) {
    let dbMessage = {
      senderId: playerId,
      timestamp: firebase.firestore.FieldValue.serverTimestamp(),
      message: message
    }
    return ChatPath.MESSAGES_COLLECTION(this.db, gameId, chatRoomId).doc(messageId).set(dbMessage);
  }
}
