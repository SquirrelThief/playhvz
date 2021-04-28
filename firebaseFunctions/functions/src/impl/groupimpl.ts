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
import * as Game from './../data/game';
import * as Group from './../data/group';
import * as Player from './../data/player';
import * as GroupUtils from './../utils/grouputils';

/**
 * Function to add a list of player ids to a group (and associated chat room).
 */
export async function addPlayersToGroup(
  db: any,
  gameId: string,
  groupId: string,
  playerIdList: Array<string>
) {
  const groupSnapshot = await db.collection(Game.COLLECTION_PATH)
    .doc(gameId)
    .collection(Group.COLLECTION_PATH)
    .doc(groupId)
    .get();

  for (const playerId of playerIdList) {
    await GroupUtils.addPlayerToGroup(db, gameId, groupSnapshot, playerId)
  }
}

/**
 * Function to remove a player from a group (and associated chat room).
 */
export async function removePlayerFromGroup(
  db: any,
  gameId: string,
  playerId: string,
  groupId: string,
) {
  const playerSnapshot = await db.collection(Game.COLLECTION_PATH)
    .doc(gameId)
    .collection(Player.COLLECTION_PATH)
    .doc(playerId)
    .get()

  const groupSnapshot = await db.collection(Game.COLLECTION_PATH)
    .doc(gameId)
    .collection(Group.COLLECTION_PATH)
    .doc(groupId)
    .get()
  await GroupUtils.removePlayerFromGroup(db, gameId, groupSnapshot, playerSnapshot)
}