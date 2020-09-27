/*
 * Copyright 2020 Google Inc.

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

// Fake JSON object that serves as our "firestore" database. Controls adding and reading objects/documents.
// TODO: use seeded id generator so ids are the same every time instead of random.  

class FakeDatabase {
    // Type of database object/document we're setting/getting.
    Type = {
        game: "game",
        chatRoom: "chatRoom",
        group: "group",
        player: "player",
        reward: "reward",
    };

    constructor() {
        this.fakeDb = {}
    }

    /** 
     * This function saves us some redundant copy-paste but might not be super readable :/. The key idea is
     * that at certain levels of the database we perform the exact same type of operations. Namely, at the 
     * root (/*) level the given collection name is the root collection name. At the <type> level, e.g. "groups",
     * the collection path is /games/<gameId>/<typeCollectionName>/<itemId>, e.g. /games/<gameId>/groups/<groupId>.
     * Instead of copy-pasting the same logic in all the places we just need to define the hierarchy correctly.
     * 
     * Adding a new database collection should be easy. Look at its ancestry and add a function that supports that
     * ancestry. E.g. ancestry:
     * /games/gameId 
     *    -> function: "TopLevelItem"
     *    -> functon args needed: gameId, gameData
     * /games/gameId/players/playerId 
     *    -> function: "GameSubItem" 
     *    -> function args needed: gameId, playerId, playerData
     * /games/gameId/rewards/rewardId/claimCodes/claimCodeId
     *    -> function: "RewardSubItem"
     *    -> function args needed: gameId, rewardId, claimCodeId, claimCodeData
     */
    add = function (type, ...args) {
        if (args.length < 2) {
            // Minimum args: [path ids], item id, item data.
            throw "Too few args, expected item type, [pathIds], itemId, and itemData."
        }
        let collectionName = "error_an_id_was_passed_wrong_to_add"
        switch (type) {
            case this.Type.game:
                // /games
                collectionName = GamePath.COLLECTION_PATH;
                this.addTopLevelItem(collectionName, /* id= */ args[0], /* object= */ args[1]);
                break;
            case this.Type.group:
                // /games/gameId/groups
                collectionName = GroupPath.COLLECTION_PATH;
                this.addGameSubItem(collectionName, /* gameId= */ args[0], /* id= */ args[1], /* object= */ args[2]);
                break;
            case this.Type.chatRoom:
                // /games/gameId/chatRooms
                collectionName = ChatPath.COLLECTION_PATH;
                this.addGameSubItem(collectionName, /* gameId= */ args[0], /* id= */ args[1], /* object= */ args[2]);
                break;
            case this.Type.player:
                // /games/gameId/players
                collectionName = PlayerPath.COLLECTION_PATH;
                this.addGameSubItem(collectionName, /* gameId= */ args[0], /* id= */ args[1], /* object= */ args[2]);
                break;
            case this.Type.reward:
                // /games/gameId/rewards
                collectionName = RewardPath.COLLECTION_PATH;
                this.addGameSubItem(collectionName, /* gameId= */ args[0], /* id= */ args[1], /* object= */ args[2]);
                break;
        }
    }

    /** Adds an item to the root of the fake database (aka /*). */
    addTopLevelItem(collectionName, itemId, itemData) {
        if (!this.fakeDb[collectionName]) {
            this.fakeDb[collectionName] = {}
        }
        this.fakeDb[collectionName][itemId] = itemData;
    }

    /** Adds an item to game's subcollection (aka /games/gameId/*). */
    addGameSubItem(collectionName, gameId, itemId, itemData) {
        if (!this.fakeDb[GamePath.COLLECTION_PATH][gameId][collectionName]) {
            this.fakeDb[GamePath.COLLECTION_PATH][gameId][collectionName] = {}
        }
        this.fakeDb[GamePath.COLLECTION_PATH][gameId][collectionName][itemId] = itemData;
    }
}