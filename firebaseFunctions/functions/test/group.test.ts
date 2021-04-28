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
chai.use(chaiAsPromised);
const assert = chai.assert;

const db = TestEnv.db;
const playHvzFunctions = TestEnv.playHvzFunctions;

describe('Group Firebase Function Tests', () => {

    after(async () => {
        TestEnv.after();
    });

    it('addPlayersToGroup adds players to group', async () => {
        await TestSetup.initializeDatabase();
        const gameId = TestSetup.FAKE_GAME_ID;
        const groupId = TestSetup.FAKE_GROUP_ID;
        const wrappedFunction = TestEnv.wrap(playHvzFunctions.addPlayersToGroup);
        const data = { gameId: gameId, groupId: groupId, playerIdList: [TestSetup.FAKE_HUMAN_PLAYER_ID, TestSetup.FAKE_ZOMBIE_PLAYER_ID] };

        await wrappedFunction(data, TestEnv.context)

        const groupSnapshot = await db.collection("games").doc(gameId).collection("groups").doc(groupId).get();
        const groupData = groupSnapshot.data()
        assert.equal(groupData!["members"].length, 3)
        await TestSetup.destroyDatabase();
    });

    it('removePlayerFromGroup removes player from group', async () => {
        await TestSetup.initializeDatabase();
        const gameId = TestSetup.FAKE_GAME_ID;
        const groupId = TestSetup.FAKE_GROUP_ID;
        const addPlayerToGroup = TestEnv.wrap(playHvzFunctions.addPlayersToGroup);
        const addPlayerData = { gameId: gameId, groupId: groupId, playerIdList: [TestSetup.FAKE_HUMAN_PLAYER_ID] };
        await addPlayerToGroup(addPlayerData, TestEnv.context)
        const wrappedFunction = TestEnv.wrap(playHvzFunctions.removePlayerFromGroup);
        const data = { gameId: gameId, groupId: groupId, playerId: TestSetup.FAKE_HUMAN_PLAYER_ID };

        await wrappedFunction(data, TestEnv.context)

        const groupSnapshot = await db.collection("games").doc(gameId).collection("groups").doc(groupId).get();
        const groupData = groupSnapshot.data()
        assert.equal(groupData!["members"].length, 1)
        await TestSetup.destroyDatabase();
    });

});
