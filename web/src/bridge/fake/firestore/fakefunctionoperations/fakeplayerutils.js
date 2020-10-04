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
        [PlayerPath.FIELD__NAME]: name,
        [PlayerPath.FIELD__ALLEGIANCE]: Defaults.defaultAllegiance,
        [PlayerPath.FIELD__CHAT_MEMBERSHIPS]: {},
        [PlayerPath.FIELD__AVATAR_URL]: 'https://lh3.googleusercontent.com/GoKTAX0zAEt6PlzUkTn7tMeK-q1hwKDpzWsMJHBntuyR7ZKVtFXjRkbFOEMqrqxPWJ-7dbCXD7NbVgHd7VmkYD8bDzsjd23XYk0KyALC3BElIk65vKajjjRD_X2_VkLPOVejrZLpPpa2ebQVUHJF5UXVlkst0m6RRqs2SumRzC7EMmEeq9x_TurwKUJmj7PhNBPCeoDEh51jAIc-ZqvRfDegLgq-HtoyJAo91lbD6jqA2-TFufJfiPd4nOWnKhZkQmarxA8LQT0kOu7r3M5F-GH3pCbQqpH1zraha8CqvKxMGLW1i4CbDs1beXatKTdjYhb1D_MVnJ6h7O4WX3GULwNTRSIFVOrogNWm4jWLMKfKt3NfXYUsCOMhlpAI3Q8o1Qgbotfud4_HcRvvs6C6i17X-oQm8282rFu6aQiLXOv55FfiMnjnkbTokOA1OGDQrkBPbSVumz9ZE3Hr-J7w_G8itxqThsSzwtK6p5YR_9lnepWe0HRNKfUZ2x-a2ndT9m6aRXC_ymWHQGfdGPvTfHOPxUpY8mtX2vknmj_dn4dIuir1PpcN0DJVVuyuww3sOn-1YRFh80gBFvwFuMnKwz8GY8IX5gZmbrrBsy_FmwFDIvBcwNjZKd9fH2gkK5rk1AlWv12LsPBsrRIEaLvcSq7Iim9XSsiivzcNrLFG=w294-h488-no',
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
    if (player[PlayerPath.FIELD__ALLEGIANCE] === newAllegiance) {
        return
    }
    //StatUtils.invalidateGameStats(db, gameId)
    player[PlayerPath.FIELD__ALLEGIANCE] = newAllegiance
    FakeGroupUtils.updatePlayerMembershipInGroups(fakeDatabase, gameId, player)
}
