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

import * as admin from 'firebase-admin';

import * as Chat from './../data/chat';
import * as ChatUtils from './../utils/chatutils';
import * as Defaults from './../data/defaults';
import * as Game from './../data/game';
import * as Group from './../data/group';
import * as GroupUtils from './../utils/grouputils';
import * as Player from './../data/player';

/**
 * Function to add a list of players to a chat. Updates chat room membership for each player and adds them to the right group.
 */
export async function addPlayersToChat(
  db: any,
  gameId: string,
  groupId: string,
  chatRoomId: string,
  playerIdList: Array<string>
) {
  const groupDocSnapshot = await db.collection(Game.COLLECTION_PATH)
    .doc(gameId)
    .collection(Group.COLLECTION_PATH)
    .doc(groupId)
    .get();

  for (const playerId of playerIdList) {
    await ChatUtils.addPlayerToChat(db, gameId, playerId, groupDocSnapshot, chatRoomId, /* isDocRef= */ false)
  }
}

/**
 * Function to remove a player from a chat. Updates chat room membership for the player and removes them from the right group.
 */
export async function removePlayerFromChat(
  db: any,
  gameId: string,
  playerId: string,
  chatRoomId: string
) {
  const playerSnapshot = await db.collection(Game.COLLECTION_PATH)
    .doc(gameId)
    .collection(Player.COLLECTION_PATH)
    .doc(playerId)
    .get()
  const chatRoomData = (await db.collection(Game.COLLECTION_PATH)
    .doc(gameId)
    .collection(Chat.COLLECTION_PATH)
    .doc(chatRoomId)
    .get())
    .data();
  if (chatRoomData === undefined) {
    console.log("Chat room was undefined, not removing player.")
    return
  }
  const group = await db.collection(Game.COLLECTION_PATH)
    .doc(gameId)
    .collection(Group.COLLECTION_PATH)
    .doc(chatRoomData[Chat.FIELD__GROUP_ID])
    .get()
  if (chatRoomData[Chat.FIELD__WITH_ADMINS]) {
    const visibilityField = Player.FIELD__CHAT_MEMBERSHIPS + "." + chatRoomId + "." + Player.FIELD__CHAT_VISIBILITY
    await playerSnapshot.ref.update({
      [visibilityField]: false
    })
    return
  }
  await ChatUtils.removePlayerFromChat(db, gameId, playerSnapshot, group, chatRoomId)
}

/**
 * Function to get or create the "chat with admins" chat room. Returns the chat room id.
 */
export async function createOrGetChatWithAdmin(
  db: any,
  uid: string,
  gameId: string,
  playerId: string
) {
  const playerSnapshot = await db.collection(Game.COLLECTION_PATH)
    .doc(gameId)
    .collection(Player.COLLECTION_PATH)
    .doc(playerId)
    .get()
  const playerData = playerSnapshot.data()
  const gameData = await (await db.collection(Game.COLLECTION_PATH).doc(gameId).get()).data()
  if (playerData === undefined || gameData === undefined) {
    return
  }
  const playerChatRoomIds = Object.keys(playerData[Player.FIELD__CHAT_MEMBERSHIPS])
  const adminPlayerId = gameData[Game.FIELD__FIGUREHEAD_ADMIN_PLAYER_ACCOUNT]
  const adminQuerySnapshot = await db.collection(Game.COLLECTION_PATH)
    .doc(gameId)
    .collection(Chat.COLLECTION_PATH)
    .where(admin.firestore.FieldPath.documentId(), "in", Array.from(playerChatRoomIds))
    .where(Chat.FIELD__WITH_ADMINS, "==", true)
    .get()

  if (!adminQuerySnapshot.empty) {
    // Admin chat already exists, reusing the existing chat.
    const adminChatSnapshot = adminQuerySnapshot.docs[0]
    const visibilityField = Player.FIELD__CHAT_MEMBERSHIPS + "." + adminChatSnapshot.id + "." + Player.FIELD__CHAT_VISIBILITY
    await playerSnapshot.ref.update({
      [visibilityField]: true
    })
    // "Add" the admin to the chat. Even if they are already in it, this resets their notification
    // and visibility settings so the chat reappears for them.
    const adminChatData = await adminChatSnapshot.data()
    if (adminChatData === undefined) {
      return adminChatSnapshot.id
    }
    await ChatUtils.addPlayerToChat(db,
      gameId,
      adminPlayerId,
      db.collection(Game.COLLECTION_PATH).doc(gameId).collection(Group.COLLECTION_PATH).doc(adminChatData[Chat.FIELD__GROUP_ID]),
      adminChatSnapshot.id,
                /* isDocRef= */ true)
    return adminChatSnapshot.id
  }

  // Create admin chat since it doesn't exist.
  const chatName = playerData[Player.FIELD__NAME] + " & " + Defaults.FIGUREHEAD_ADMIN_NAME
  const settings = Group.createSettings(
    /* addSelf= */ true,
    /* addOthers= */ false,
    /* removeSelf= */ true,
    /* removeOthers= */ false,
    /* autoAdd= */ false,
    /* autoRemove= */ false,
    Defaults.EMPTY_ALLEGIANCE_FILTER);
  const createdChatId = await GroupUtils.createGroupAndChat(db, uid, gameId, playerId, chatName, settings);
  const chatSnapshot = await db.collection(Game.COLLECTION_PATH)
    .doc(gameId)
    .collection(Chat.COLLECTION_PATH)
    .doc(createdChatId)
    .get()
  await chatSnapshot.ref.update({
    [Chat.FIELD__WITH_ADMINS]: true
  })
  const createdChatData = await chatSnapshot.data()
  if (createdChatData === undefined) {
    return createdChatId
  }
  await ChatUtils.addPlayerToChat(db,
    gameId,
    adminPlayerId,
    db.collection(Game.COLLECTION_PATH).doc(gameId).collection(Group.COLLECTION_PATH).doc(createdChatData[Chat.FIELD__GROUP_ID]),
    createdChatId,
    /* isDocRef= */ true)
  return createdChatId
}