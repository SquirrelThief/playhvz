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
import * as TestEnv from './testsetup';
chai.use(chaiAsPromised);
const assert = chai.assert;

const db = TestEnv.db;
const playHvzFunctions = TestEnv.playHvzFunctions;
const FAKE_GAME_NAME = "gameName"
const FAKE_PLAYER_NAME = "readyPlayer1"

describe('Player Collection Tests', () => {

    after(async () => {
        TestEnv.after();
    });

    it('changePlayerAllegiance changes allegiance to zombie', async () => {
        const gameId = await TestEnv.createGame(FAKE_GAME_NAME);
        const playerId = await TestEnv.createPlayer(gameId, FAKE_GAME_NAME, FAKE_PLAYER_NAME);
        const playerRef = db.collection("games").doc(gameId).collection("players").doc(playerId);
        const wrappedChangeToHorde = TestEnv.wrap(playHvzFunctions.changePlayerAllegiance);
        const data = { gameId: gameId, playerId: playerId, allegiance: "horde" };

        await wrappedChangeToHorde(data, TestEnv.context)

        const playerSnapshot = await playerRef.get()
        const playerData = playerSnapshot.data()
        assert.equal(playerData!["allegiance"], "horde")
        await TestEnv.deleteGame(gameId);
    });


    it('changePlayerAllegiance changes allegiance to human', async () => {
        const gameId = await TestEnv.createGame(FAKE_GAME_NAME);
        const playerId = await TestEnv.createPlayer(gameId, FAKE_GAME_NAME, FAKE_PLAYER_NAME);
        const playerRef = db.collection("games").doc(gameId).collection("players").doc(playerId);
        const wrappedChangeToHuman = TestEnv.wrap(playHvzFunctions.changePlayerAllegiance);
        const data = { gameId: gameId, playerId: playerId, allegiance: "resistance" };

        await wrappedChangeToHuman(data, TestEnv.context)

        const playerSnapshot = await playerRef.get()
        const playerData = playerSnapshot.data()
        assert.equal(playerData!["allegiance"], "resistance")
        assert.equal(Object.keys(playerData!["lives"]!).length, 1)
        await TestEnv.deleteGame(gameId);
    });

    /* // Doesn't work for some reason, not sure... 
    it('changePlayerAllegiance adds additional life to already human player', async () => {
        const gameId = await TestEnv.createGame(FAKE_GAME_NAME);
        const playerId = await TestEnv.createHumanPlayer(gameId, FAKE_GAME_NAME, FAKE_PLAYER_NAME);
        const playerRef = db.collection("games").doc(gameId).collection("players").doc(playerId);
        const initialPlayerData = (await playerRef.get()).data()
        assert.equal(Object.keys(initialPlayerData!["lives"]!).length, 1)

        const wrappedChangeToHumanAgain = TestEnv.wrap(playHvzFunctions.changePlayerAllegiance)
        const data = { gameId: gameId, playerId: playerId, allegiance: "resistence" };
        await wrappedChangeToHumanAgain(data, TestEnv.context)

        const playerSnapshot = await playerRef.get()
        const playerData = playerSnapshot.data()
        assert.equal(playerData!["allegiance"], "resistence")
        assert.equal(Object.keys(playerData!["lives"]!).length, 2)
        await TestEnv.deleteGame(gameId);
    });*/
});
