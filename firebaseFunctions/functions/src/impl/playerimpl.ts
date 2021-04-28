/*
 * Copyright 2021 Google Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import * as functions from 'firebase-functions';

import * as Defaults from './../data/defaults';
import * as Game from './../data/game';
import * as Player from './../data/player';
import * as PlayerUtils from './../utils/playerutils';
import * as RewardUtils from './../utils/rewardutils';

/**
 * Function to infect a player from their lifecode.
 */
export async function infectPlayerByLifeCode(
  db: any,
  gameId: string,
  infectorPlayerId: string,
  lifeCode: string
) {
  // Check if life code is associated with valid human player.
  const lifeCodeStatusField = Player.FIELD__LIVES + "." + lifeCode + "." + Player.FIELD__LIFE_CODE_STATUS
  const infectedPlayerQuerySnapshot = await db.collection(Game.COLLECTION_PATH)
    .doc(gameId)
    .collection(Player.COLLECTION_PATH)
    .where(lifeCodeStatusField, "==", /* isActive= */ true)
    .get()

  if (infectedPlayerQuerySnapshot.empty || infectedPlayerQuerySnapshot.docs.length > 1) {
    throw new functions.https.HttpsError('failed-precondition', 'No valid player with given life code exists.');
  }
  const infectedPlayerSnapshot = infectedPlayerQuerySnapshot.docs[0];
  const infectedPlayerData = await infectedPlayerSnapshot.data()
  if (infectedPlayerData === undefined) {
    return
  }

  // TODO: handle player infecting themselves.

  // Use up the life code and infect the player if they are out of lives
  if (infectedPlayerData[Player.FIELD__ALLEGIANCE] === Defaults.HUMAN_ALLEGIANCE_FILTER) {
    // TODO: make this a transaction.
    await RewardUtils.giveRewardForInfecting(db, gameId, infectorPlayerId)
    // Mark life code as used, aka deactivated
    await infectedPlayerSnapshot.ref.update({
      [lifeCodeStatusField]: false
    })

    const lives = infectedPlayerData[Player.FIELD__LIVES]
    if (lives === undefined) {
      return
    }
    for (const key of Object.keys(lives)) {
      const metadata = lives[key]
      if (metadata === undefined) {
        continue
      }
      if (metadata[Player.FIELD__LIFE_CODE_STATUS] === true
        && metadata[Player.FIELD__LIFE_CODE] !== lifeCode) {
        // Player still has some lives left, don't turn them into a zombie.
        console.log("Not turning player to zombie, they still have life codes active.")
        return
      }
    }
    await PlayerUtils.internallyChangePlayerAllegiance(db, gameId, infectedPlayerSnapshot.id, Defaults.ZOMBIE_ALLEGIANCE_FILTER)
  }
}