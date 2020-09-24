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
  }

  /**
  * Function that gets the docSnapshot for the given game.
  *
  * @param gameId gameId of the game to get
  */
  getGame(gameId) {
    return GamePath.GAME_DOC_REF(this.db, gameId).get();
  }
}
