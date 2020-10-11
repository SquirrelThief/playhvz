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
// The main thing defined here that you might need to update is the firestore hierarchy. This is the 
// class that defines hierarchy for the fake imitation of firestore. E.g. /games/gameId/[chatRoom|players|groups]/etc.
// TODO: use seeded id generator so ids are the same every time instead of random.  

class FakeDatabase {
    constructor(idGenerator) {
        this.idGenerator = idGenerator
        this.fakeDb = {}
    }

    getAllGames() {
        return Object.values(this.fakeDb[GamePath.COLLECTION_PATH])
    }

    getGame(gameId) {
        return this.fakeDb[GamePath.COLLECTION_PATH][gameId];
    }

    getAllPlayersOfGame(gameId) {
        return Object.values(this.fakeDb[GamePath.COLLECTION_PATH][gameId][PlayerPath.COLLECTION_PATH])
    }

    getPlayer(gameId, playerId) {
        return this.fakeDb[GamePath.COLLECTION_PATH][gameId][PlayerPath.COLLECTION_PATH][playerId];
    }

    getPlayerByName(gameId, playerName) {
        let players = this.getAllPlayersOfGame(gameId);
        for (let player of players) {
            if (player.name == playerName) {
                return player
            }
        }
        return null
    }

    getAllGroupsOfGame(gameId) {
        return Object.values(this.fakeDb[GamePath.COLLECTION_PATH][gameId][GroupPath.COLLECTION_PATH])
    }

    getGroup(gameId, groupId) {
        return this.fakeDb[GamePath.COLLECTION_PATH][gameId][GroupPath.COLLECTION_PATH][groupId];
    }

    getAllChatsOfGame(gameId) {
        return Object.values(this.fakeDb[GamePath.COLLECTION_PATH][gameId][ChatPath.COLLECTION_PATH])
    }

    getChatRoom(gameId, chatRoomId) {
        return this.fakeDb[GamePath.COLLECTION_PATH][gameId][ChatPath.COLLECTION_PATH][chatRoomId];
    }

    getAllChatMessages(gameId, chatRoomId) {
        let messages = this.fakeDb[GamePath.COLLECTION_PATH][gameId][ChatPath.COLLECTION_PATH][chatRoomId][ChatPath.MESSAGE_COLLECTION_PATH]
        if (!messages) {
            return []
        }
        return Object.values(messages);
    }

    getAllRewardsForGame(gameId) {
        return Object.values(this.fakeDb[GamePath.COLLECTION_PATH][gameId][RewardPath.COLLECTION_PATH])
    }

    getAllClaimCodesForReward(gameId, rewardId) {
        return Object.values(this.fakeDb[GamePath.COLLECTION_PATH][gameId][RewardPath.COLLECTION_PATH][rewardId][RewardPath.CLAIM_CODE_COLLECTION_PATH])
    }

    getReward(gameId, rewardId) {
        return this.fakeDb[GamePath.COLLECTION_PATH][gameId][RewardPath.COLLECTION_PATH][rewardId];
    }

    getAllMissionsOfGame(gameId) {
        return Object.values(this.fakeDb[GamePath.COLLECTION_PATH][gameId][MissionPath.COLLECTION_PATH])
    }

    getMission(gameId, missionId) {
        return this.fakeDb[GamePath.COLLECTION_PATH][gameId][MissionPath.COLLECTION_PATH][missionId];
    }

    setChatRoom(gameId, chatRoomId, chatRoom) {
        this.verifyId(gameId)
        this.verifyId(chatRoomId)
        this.verifyObject(chatRoom)
        let path = [GamePath.COLLECTION_PATH, gameId, ChatPath.COLLECTION_PATH, chatRoomId]
        this.setItem(path, chatRoom);
    }

    setChatMessage(gameId, chatRoomId, message) {
        this.verifyId(gameId)
        this.verifyId(chatRoomId)
        this.verifyObject(message)
        let path = [GamePath.COLLECTION_PATH, gameId, ChatPath.COLLECTION_PATH, chatRoomId, ChatPath.MESSAGE_COLLECTION_PATH, message.id]
        this.setItem(path, message);
    }

    setGame(gameId, game) {
        this.verifyId(gameId)
        this.verifyObject(game)
        let path = [GamePath.COLLECTION_PATH, gameId]
        this.setItem(path, game);
    }

    setGroup(gameId, groupId, group) {
        this.verifyId(gameId)
        this.verifyId(groupId)
        this.verifyObject(group)
        let path = [GamePath.COLLECTION_PATH, gameId, GroupPath.COLLECTION_PATH, groupId]
        this.setItem(path, group);
    }

    setPlayer(gameId, playerId, player) {
        this.verifyId(gameId)
        this.verifyId(playerId)
        this.verifyObject(player)
        let path = [GamePath.COLLECTION_PATH, gameId, PlayerPath.COLLECTION_PATH, playerId]
        this.setItem(path, player);
    }

    setReward(gameId, rewardId, reward) {
        this.verifyId(gameId)
        this.verifyId(rewardId)
        this.verifyObject(reward)
        let path = [GamePath.COLLECTION_PATH, gameId, RewardPath.COLLECTION_PATH, rewardId]
        this.setItem(path, reward);
    }

    setClaimCode(gameId, rewardId, claimCodeId, claimCode) {
        this.verifyId(gameId)
        this.verifyId(rewardId)
        this.verifyId(claimCodeId)
        this.verifyObject(claimCode)
        let path = [GamePath.COLLECTION_PATH, gameId, RewardPath.COLLECTION_PATH, rewardId, RewardPath.CLAIM_CODE_COLLECTION_PATH, claimCodeId]
        this.setItem(path, claimCode);
    }

    setMission(gameId, missionId, mission) {
        this.verifyId(gameId)
        this.verifyId(missionId)
        this.verifyObject(mission)
        let path = [GamePath.COLLECTION_PATH, gameId, MissionPath.COLLECTION_PATH, missionId]
        this.setItem(path, mission);
    }

    setUser(userId, user) {
        this.verifyId(userId)
        this.verifyObject(user)
        let path = [UserPath.COLLECTION_PATH, userId]
        this.setItem(path, user);
    }

    /** Adds an item to the fake database along the desired path. */
    setItem(path, itemData) {
        assert(path.length % 2 == 0)
        let object = this.fakeDb
        for (let i = 0; i < path.length; i += 2) {
            let collectionName = path[i]
            let itemId = path[i + 1]
            if (!object[collectionName]) {
                object[collectionName] = {}
            }
            if (i == path.length - 2) {
                object[collectionName][itemId] = itemData
            } else {
                object = object[collectionName][itemId]
            }
        }
    }

    verifyId(id) {
        assert(typeof id == 'string' && id)
    }

    verifyObject(object) {
        assert(typeof object == 'object')
    }
}