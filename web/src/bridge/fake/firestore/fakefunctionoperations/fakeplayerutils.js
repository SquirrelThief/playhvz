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

/** Class to mimic locally what firebase functions would have done on the server side. */

class FakePlayerUtils { }

/* Creates a group with no owners because the server is the manager. */
FakePlayerUtils.createFigureHeadPlayer = function (fakeDatabase, game) {
    let figureHeadPlayer = FakePlayerUtils.create("", Defaults.FIGUREHEAD_ADMIN_NAME)
    figureHeadPlayer.id = fakeDatabase.idGenerator.generateId("player", "")
    fakeDatabase.setPlayer(game.id, figureHeadPlayer.id, figureHeadPlayer)
    game.figureheadAdminPlayerAccount = figureHeadPlayer.id
}


/* Creates a group with no owners because the server is the manager. */
FakePlayerUtils.create = function (uid, name) {
    return new Player({
        [PlayerPath.FIELD__USER_ID]: uid,
        [PlayerPath.FIELD_NAME]: name,
        [PlayerPath.FIELD_ALLEGIANCE]: Defaults.defaultAllegiance,
        [PlayerPath.FIELD__CHAT_MEMBERSHIPS]: {},
        [PlayerPath.FIELD__LIVES]: {}
    });
}

FakePlayerUtils.internallyChangePlayerAllegiance = function (fakeDatabase, gameId, playerId, newAllegiance, time, newLifeCode) {
    let player = fakeDatabase.getPlayer(gameId, playerId)
    if (newAllegiance === Defaults.HUMAN_ALLEGIANCE_FILTER) {
        // Even if the player is already a human generate a new lifecode for them. Players aren't zombies
        // until all their lifecodes are used so this lets us prevent a player from becoming a zombie
        // if someone else got their existing lifecode already.
        let lifeData = {
            [PlayerPath.FIELD__LIFE_CODE]: newLifeCode,
            [PlayerPath.FIELD__LIFE_CODE_STATUS]: true,
            [PlayerPath.FIELD__LIFE_CODE_TIMESTAMP]: time
        }
        player[PlayerPath.FIELD__LIVES][newLifeCode] = lifeData
    }
    if (player[PlayerPath.FIELD_ALLEGIANCE] === newAllegiance) {
        return
    }
    //StatUtils.invalidateGameStats(db, gameId)
    player[PlayerPath.FIELD_ALLEGIANCE] = newAllegiance
    FakeGroupUtils.updatePlayerMembershipInGroups(fakeDatabase, gameId, player)
}
