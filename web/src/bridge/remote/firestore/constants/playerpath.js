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

/***********************************************************************
 * Firebase constants for the Player collection.
 ***********************************************************************/
class PlayerPath { }

PlayerPath.COLLECTION_PATH = "players";

PlayerPath.FIELD__NAME = "name";
PlayerPath.FIELD__ALLEGIANCE = "allegiance";
PlayerPath.FIELD__AVATAR_URL = "avatarUrl";
PlayerPath.FIELD__USER_ID = "userId";
PlayerPath.FIELD__LIVES = "lives";
PlayerPath.FIELD__LIFE_CODE = "lifeCode";
PlayerPath.FIELD__LIFE_CODE_STATUS = "isActive";
PlayerPath.FIELD__LIFE_CODE_TIMESTAMP = "created";
PlayerPath.FIELD__CHAT_MEMBERSHIPS = "chatRoomMemberships";
PlayerPath.FIELD__CHAT_VISIBILITY = "isVisible";
PlayerPath.FIELD__CHAT_NOTIFICATIONS = "allowNotifications";

PlayerPath.PLAYERS_COLLECTION = function (db, gameId) {
  return GamePath.GAMES_COLLECTION(db).doc(gameId).collection(PlayerPath.COLLECTION_PATH);
}

PlayerPath.PLAYERS_QUERY = function (db) {
  return db.collectionGroup(PlayerPath.COLLECTION_PATH);
}

PlayerPath.PLAYER_IN_GAME_QUERY = function (db, userId, gameId) {
  return PlayerPath.PLAYERS_COLLECTION(db, gameId).where(PlayerPath.FIELD__USER_ID, "==", userId);
}

PlayerPath.PLAYER_DOC_REF = function (db, gameId, playerId) {
  return PlayerPath.PLAYERS_COLLECTION(db, gameId).doc(playerId);
}