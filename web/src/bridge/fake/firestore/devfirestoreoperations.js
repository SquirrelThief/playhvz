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
class DevFirestoreOperations {
  db;

  constructor() {
    this.db = firebase.firestore();
  }

  /**
   * Function that gets all the Chats in the game. Should not be exposed to prod.
   * 
   * @param gameId GameId to query
   */
  getAllChatsInGame(gameId) {
    return ChatPath.CHAT_ROOMS_COLLECTION(this.db, gameId).get();
  }

  /**
   * Function that gets a chat room by name. Should not be exposed to prod.
   * 
   * @param gameId GameId to query
   * @param chatRoomName name to find
   */
  getChatRoomByName(gameId, chatRoomName) {
    return ChatPath.CHAT_ROOMS_COLLECTION(this.db, gameId).where(ChatPath.FIELD__NAME, "==", chatRoomName).get();
  }

  getMissionByName(gameId, missionName) {
    return MissionPath.MISSION_COLLECTION(this.db, gameId).where(MissionPath.FIELD__NAME, "==", missionName).get();
  }

  getRewardByShortName(gameId, shortName) {
    return RewardPath.REWARD_COLLECTION(this.db, gameId).where(RewardPath.FIELD__SHORT_NAME, "==",shortName).get();
  }
}
