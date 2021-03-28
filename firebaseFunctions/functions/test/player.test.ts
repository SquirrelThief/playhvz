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
import * as GeneralUtils from '../src/utils/generalutils';
chai.use(chaiAsPromised);
const assert = chai.assert;

const db = TestEnv.db;
const playHvzFunctions = TestEnv.playHvzFunctions;
const FAKE_GAME_NAME = "gameName"
const FAKE_START_TIME = 0
const FAKE_END_TIME = 5
const FAKE_PLAYER_ID = "playerId"

describe('Player Collection Tests', () => {
    after(async () => {
        TestEnv.after();
    });

    it('changePlayerAllegiance changes allegiance to horde', async () => {
        const wrappedCreateGame = TestEnv.wrap(playHvzFunctions.createGame);
        const gameData = {
            name: FAKE_GAME_NAME,
            startTime: FAKE_START_TIME,
            endTime: FAKE_END_TIME
        };
        const createdGameId = await wrappedCreateGame(gameData, TestEnv.context);

        const playerRef = db.collection("games").doc(createdGameId).collection("players").doc(FAKE_PLAYER_ID);
        await playerRef.set({ "allegiance": "undeclared" });
        const wrappedChangeToHorde = TestEnv.wrap(playHvzFunctions.changePlayerAllegiance);
        const data = { gameId: createdGameId, playerId: FAKE_PLAYER_ID, allegiance: "horde" };

        await wrappedChangeToHorde(data, TestEnv.context)

        const playerSnapshot = await playerRef.get()
        const playerData = playerSnapshot.data()
        assert.equal(playerData!["allegiance"], "horde")
        await GeneralUtils.deleteDocument(db, playerRef)
    });
});
