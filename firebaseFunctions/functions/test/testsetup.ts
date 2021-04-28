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


/**********************************************************
 * Firebase util functions
 **********************************************************/

var fakeGameData = require('./data/fake_game_data.json');
import * as TestEnv from './testenv';
import * as Game from './../src/data/game';
import * as Player from './../src/data/player';
import * as QuizQuestion from './../src/data/quizquestion';
import * as GeneralUtils from './../src/utils/generalutils';

const MAPS_NOT_COLLECTIONS = [
    Player.FIELD__CHAT_MEMBERSHIPS,
    Player.FIELD__LIVES,
    Game.FIELD__FAQ,
    Game.FIELD__RULES,
    QuizQuestion.FIELD__ANSWERS,
];

/* Note that ids should not include dashes. */
export const FAKE_GAME_ID = "fakeGameId";
export const FAKE_GAME_NAME = "Fake Test Game";
export const FAKE_ZOMBIE_PLAYER_ID = "fakePlayerIdHorde";
export const FAKE_HUMAN_PLAYER_ID = "fakePlayerIdHuman";
export const FAKE_HUMAN_PLAYER_LIFE_CODE = "life-code-1";
export const FAKE_CHAT_ROOM_ID = "fakeChatIdMyChat";
export const FAKE_GROUP_ID = "fakeGroupIdMyChat";
export const FAKE_CHAT_WITH_ADMINS_CHAT_ID = "fakeChatIdChatWithAdmins";
export const FAKE_CHAT_WITH_ADMINS_GROUP_ID = "fakeGroupIdChatWithAdmins";

export async function initializeDatabase() {
    await parseCollection(fakeGameData);
}

export async function destroyDatabase() {
    return await GeneralUtils.deleteCollection(TestEnv.db, TestEnv.db.collection(Game.COLLECTION_PATH))
}

/**
 * Data is a collection if 1.) it has an odd depth or 2.) it contains only objects or no objects.
 */
function isCollection(data: any, path: Array<string>) {
    if (typeof data != 'object' ||
        data == null ||
        data.length === 0 ||
        isEmpty(data)) {
        return false;
    }
    if (MAPS_NOT_COLLECTIONS.includes(path[path.length - 1])) {
        // Even though this is an object, we want it as a map and not a collection.
        return false;
    }
    for (const key in data) {
        if (typeof data[key] != 'object' || data[key] == null) {
            // If there is at least one non-object item in the data then it cannot be collection.
            return false;
        }
    }
    return true;
}

// Checks if object is empty.
function isEmpty(obj: object) {
    for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
            return false;
        }
    }
    return true;
}

async function upload(data: any, path: Array<string>) {
    return await TestEnv.db
        .doc(path.join('/'))
        .set(data)
        .catch(() => console.error(`Could not write document ${path.join('/')}.`));
}

/**
 *
 */
async function parseCollection(data: any, path: Array<string> = []) {
    if (path.length > 0 && path.length % 2 == 0) {
        // Documents are always at an even array length (formed like: [collection, docId])
        const documentData = Object.assign({}, data);
        for (const key in data) {
            // Parse any sub-collections and remove them from the data.
            if (isCollection(data[key], [...path, key])) {
                delete documentData[key]; // Remove collection object from data.
                await parseCollection(data[key], [...path, key]);
            }
        }
        if (!isEmpty(documentData)) {
            // Upload the remaining fields as a single document at this path level.
            await upload(documentData, path);
        }
    } else {
        // Collections are always at an odd array length.
        for (const key in data) {
            // Resolve each collection.
            await parseCollection(data[key], [...path, key]);
        }
    }
}






/** Creates a default game and returns the game id for the game we created. */
export async function createGame(gameName: string) {
    const wrappedCreateGame = TestEnv.wrap(TestEnv.playHvzFunctions.createGame);
    const data = {
        name: gameName,
        startTime: 0,
        endTime: 5
    };
    return await wrappedCreateGame(data, TestEnv.context);
}

export async function deleteGame(gameId: string) {
    const wrappedDeleteGame = TestEnv.wrap(TestEnv.playHvzFunctions.deleteGame);
    const data = { gameId: gameId };
    return await wrappedDeleteGame(data, TestEnv.context);
}

/** 
 * Creates a player and returns the player id. Optionally will initialize the player to the provided allegiance. 
 * 
 * @returns the player id of the newly created player
 */
export async function createPlayer(gameId: string, gameName: string, playerName: string, allegiance: string = "") {
    const wrappedJoinGame = TestEnv.wrap(TestEnv.playHvzFunctions.joinGame);
    const data = { gameName: gameName, playerName: playerName };
    await wrappedJoinGame(data, TestEnv.context)
    let playerQuerySnapshot = await TestEnv.db.collection("games").doc(gameId).collection("players").where("name", "==", playerName).get();
    let playerId = playerQuerySnapshot.docs[0].id;
    if (!allegiance) {
        return playerId;
    }
    // Initialize the player to the right allegiance.
    const wrappedChange = TestEnv.wrap(TestEnv.playHvzFunctions.changePlayerAllegiance);
    const allegianceData = { gameId: gameId, playerId: playerId, allegiance: allegiance };
    await wrappedChange(allegianceData, TestEnv.context)
    return playerId;
}
