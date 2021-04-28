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

const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
import * as TestEnv from './testenv';
import * as TestSetup from './testsetup';
import * as TestUtils from './testutils';
chai.use(chaiAsPromised);
const assert = chai.assert;

const db = TestEnv.db;
const playHvzFunctions = TestEnv.playHvzFunctions;

describe('Chat Firebase Function Tests', () => {

    after(async () => {
        TestEnv.after();
    });

    it('addPlayersToChat adds players to chat and updates membership', async () => {
        await TestSetup.initializeDatabase();
        const gameId = TestSetup.FAKE_GAME_ID;
        const chatRoomId = TestSetup.FAKE_CHAT_ROOM_ID;
        const groupId = TestSetup.FAKE_GROUP_ID;
        const wrappedFunction = TestEnv.wrap(playHvzFunctions.addPlayersToChat);
        const data = { gameId: gameId, groupId: groupId, chatRoomId: chatRoomId, playerIdList: [TestSetup.FAKE_HUMAN_PLAYER_ID, TestSetup.FAKE_ZOMBIE_PLAYER_ID] };

        await wrappedFunction(data, TestEnv.context)

        const groupSnapshot = await db.collection("games").doc(gameId).collection("groups").doc(groupId).get();
        const groupData = groupSnapshot.data()
        const humanPlayerSnapshot = await db.collection("games").doc(gameId).collection("players").doc(TestSetup.FAKE_HUMAN_PLAYER_ID).get();
        const humanData = humanPlayerSnapshot.data()
        const zombiePlayerSnapshot = await db.collection("games").doc(gameId).collection("players").doc(TestSetup.FAKE_ZOMBIE_PLAYER_ID).get();
        const zombieData = zombiePlayerSnapshot.data()
        assert.equal(groupData!["members"].length, 3)
        assert.equal(Object.keys(humanData!.chatRoomMemberships).includes(chatRoomId), true)
        assert.equal(Object.keys(zombieData!.chatRoomMemberships).includes(chatRoomId), true)
        await TestSetup.destroyDatabase();
    });

    it('removePlayerFromChat removes player from chat and updates membership', async () => {
        await TestSetup.initializeDatabase();
        const gameId = TestSetup.FAKE_GAME_ID;
        const chatRoomId = TestSetup.FAKE_CHAT_ROOM_ID;
        const addPlayer = TestEnv.wrap(playHvzFunctions.addPlayersToChat);
        const addPlayerData = { gameId: gameId, groupId: TestSetup.FAKE_GROUP_ID, chatRoomId: chatRoomId, playerIdList: [TestSetup.FAKE_HUMAN_PLAYER_ID] };
        await addPlayer(addPlayerData, TestEnv.context)
        const wrappedFunction = TestEnv.wrap(playHvzFunctions.removePlayerFromChat);
        const data = { gameId: gameId, chatRoomId: chatRoomId, playerId: TestSetup.FAKE_HUMAN_PLAYER_ID };

        await wrappedFunction(data, TestEnv.context)

        const groupSnapshot = await db.collection("games").doc(gameId).collection("groups").doc(TestSetup.FAKE_GROUP_ID).get();
        const groupData = groupSnapshot.data()
        const humanPlayerSnapshot = await db.collection("games").doc(gameId).collection("players").doc(TestSetup.FAKE_HUMAN_PLAYER_ID).get();
        const humanData = humanPlayerSnapshot.data()
        assert.equal(groupData!["members"].length, 1)
        assert.equal(Object.keys(humanData!.chatRoomMemberships).includes(chatRoomId), false)
        await TestSetup.destroyDatabase();
    });

    it('removePlayerFromChat hides admin chat but does not remove player', async () => {
        await TestSetup.initializeDatabase();
        const gameId = TestSetup.FAKE_GAME_ID;
        const playerId = TestSetup.FAKE_ZOMBIE_PLAYER_ID
        const chatRoomId = TestSetup.FAKE_CHAT_WITH_ADMINS_CHAT_ID;
        const wrappedFunction = TestEnv.wrap(playHvzFunctions.removePlayerFromChat);
        const data = { gameId: gameId, chatRoomId: chatRoomId, playerId: playerId };

        await wrappedFunction(data, TestEnv.context)

        const groupSnapshot = await db.collection("games").doc(gameId).collection("groups").doc(TestSetup.FAKE_CHAT_WITH_ADMINS_GROUP_ID).get();
        const groupData = groupSnapshot.data()
        const playerData = await TestUtils.getPlayerData(db, gameId, playerId)
        assert.equal(groupData!["members"].includes(playerId), true)
        assert.equal(Object.keys(playerData!.chatRoomMemberships).includes(chatRoomId), true)
        assert.equal(playerData!.chatRoomMemberships[chatRoomId]!.isVisible, false)
        await TestSetup.destroyDatabase();
    });

    it('createOrGetChatWithAdmin creates admin chat', async () => {
        await TestSetup.initializeDatabase();
        const gameId = TestSetup.FAKE_GAME_ID;
        const playerId = TestSetup.FAKE_HUMAN_PLAYER_ID;
        const wrappedFunction = TestEnv.wrap(playHvzFunctions.createOrGetChatWithAdmin);
        const data = { gameId: gameId, playerId: playerId };

        let chatRoomId = await wrappedFunction(data, TestEnv.context)

        const playerData = await TestUtils.getPlayerData(db, gameId, playerId)
        assert(chatRoomId)
        assert(Object.keys(playerData!.chatRoomMemberships).includes(chatRoomId))
        assert.equal(playerData!.chatRoomMemberships[chatRoomId]!.isVisible, true)
        await TestSetup.destroyDatabase();
    });

    it('createOrGetChatWithAdmin returns existing admin chat room id', async () => {
        await TestSetup.initializeDatabase();
        const gameId = TestSetup.FAKE_GAME_ID;
        const playerId = TestSetup.FAKE_ZOMBIE_PLAYER_ID;
        const wrappedFunction = TestEnv.wrap(playHvzFunctions.createOrGetChatWithAdmin);
        const data = { gameId: gameId, playerId: playerId };

        let chatRoomId = await wrappedFunction(data, TestEnv.context)

        const playerData = await TestUtils.getPlayerData(db, gameId, playerId)
        assert.equal(chatRoomId, TestSetup.FAKE_CHAT_WITH_ADMINS_CHAT_ID)
        assert(Object.keys(playerData!.chatRoomMemberships).includes(chatRoomId))
        assert.equal(playerData!.chatRoomMemberships[chatRoomId]!.isVisible, true)
        await TestSetup.destroyDatabase();
    });

});
