/*
 * Copyright 2020 Google Inc.
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

describe('Player Firebase Function Tests', () => {

    after(async () => {
        TestEnv.after();
    });

    it('changePlayerAllegiance changes allegiance to zombie', async () => {
        await TestSetup.initializeDatabase();
        const gameId = TestSetup.FAKE_GAME_ID;
        const playerId = TestSetup.FAKE_HUMAN_PLAYER_ID;
        const playerRef = db.collection("games").doc(gameId).collection("players").doc(playerId);
        const wrappedChangeToHorde = TestEnv.wrap(playHvzFunctions.changePlayerAllegiance);
        const data = { gameId: gameId, playerId: playerId, allegiance: "horde" };

        await wrappedChangeToHorde(data, TestEnv.context)

        const playerSnapshot = await playerRef.get()
        const playerData = playerSnapshot.data()
        assert.equal(playerData!["allegiance"], "horde")
        await TestSetup.destroyDatabase();
    });


    it('changePlayerAllegiance changes allegiance to human', async () => {
        await TestSetup.initializeDatabase();
        const gameId = TestSetup.FAKE_GAME_ID;
        const playerId = TestSetup.FAKE_ZOMBIE_PLAYER_ID;
        const playerRef = db.collection("games").doc(gameId).collection("players").doc(playerId);
        const wrappedChangeToHuman = TestEnv.wrap(playHvzFunctions.changePlayerAllegiance);
        const data = { gameId: gameId, playerId: playerId, allegiance: "resistance" };

        await wrappedChangeToHuman(data, TestEnv.context)

        const playerSnapshot = await playerRef.get()
        const playerData = playerSnapshot.data()
        assert.equal(playerData!["allegiance"], "resistance")
        assert.equal(Object.keys(playerData!["lives"]!).length, 1)
        await TestSetup.destroyDatabase();
    });

    it('changePlayerAllegiance adds additional life to already human player', async () => {
        await TestSetup.initializeDatabase();
        const gameId = TestSetup.FAKE_GAME_ID;
        const playerId = TestSetup.FAKE_HUMAN_PLAYER_ID;
        const playerRef = db.collection("games").doc(gameId).collection("players").doc(playerId);
        const wrappedChangeToHuman = TestEnv.wrap(playHvzFunctions.changePlayerAllegiance);
        const data = { gameId: gameId, playerId: playerId, allegiance: "resistance" };

        await wrappedChangeToHuman(data, TestEnv.context)

        const playerSnapshot = await playerRef.get()
        const playerData = playerSnapshot.data()
        assert.equal(playerData!["allegiance"], "resistance")
        assert.equal(Object.keys(playerData!["lives"]!).length, 2)
        await TestSetup.destroyDatabase();
    });

    it('infectPlayerByLifeCode infects player', async () => {
        await TestSetup.initializeDatabase();
        const gameId = TestSetup.FAKE_GAME_ID;
        const zombiePlayerId = TestSetup.FAKE_ZOMBIE_PLAYER_ID;
        const humanPlayerId = TestSetup.FAKE_HUMAN_PLAYER_ID;
        const wrappedInfect = TestEnv.wrap(playHvzFunctions.infectPlayerByLifeCode);
        const data = { gameId: gameId, infectorPlayerId: zombiePlayerId, lifeCode: TestSetup.FAKE_HUMAN_PLAYER_LIFE_CODE };

        await wrappedInfect(data, TestEnv.context)

        const humanPlayerRef = db.collection("games").doc(gameId).collection("players").doc(humanPlayerId);
        const playerSnapshot = await humanPlayerRef.get()
        const playerData = playerSnapshot.data()
        assert.equal(playerData!["allegiance"], "horde")
        await TestSetup.destroyDatabase();
    });

});
