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
    figureHeadPlayer.id = Utils.generateFakeId()
    fakeDatabase.add(fakeDatabase.Type.player, game.id, figureHeadPlayer.id, figureHeadPlayer)
    game.figureheadAdminPlayerAccount = figureHeadPlayer.id
}


/* Creates a group with no owners because the server is the manager. */
FakePlayerUtils.create = function (uid, name) {
    return new Player({
        userId: uid,
        name: name,
    });
}

