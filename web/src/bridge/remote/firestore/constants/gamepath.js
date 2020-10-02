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
 * Firebase constants for the Game collection.
 ***********************************************************************/
class GamePath { }

GamePath.COLLECTION_PATH = "games";
GamePath.FIELD__ADMIN_GROUP_ID = "adminGroupId";
GamePath.FIELD__OWNERS = "owners";
GamePath.FIELD__CREATOR_USER_ID = "creatorUserId";
GamePath.FIELD__ADMIN_ON_CALL_PLAYER_ID = "adminOnCallPlayerId";

GamePath.GAMES_COLLECTION = function (db) {
  return db.collection(GamePath.COLLECTION_PATH);
}

GamePath.GAME_DOC_REF = function (db, gameId) {
  return GamePath.GAMES_COLLECTION(db).doc(gameId);
}