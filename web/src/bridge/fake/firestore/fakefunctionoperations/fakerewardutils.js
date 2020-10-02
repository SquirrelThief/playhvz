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

class FakeRewardUtils { }

FakeRewardUtils.createManagedRewards = function (fakeDatabase, game) {
    let infectRewardData = FakeRewardUtils.createReward(
        Defaults.INFECT_REWARD_SHORT_NAME,
        Defaults.INFECT_REWARD_LONG_NAME,
        Defaults.INFECT_REWARD_DESCRIPTION,
        Defaults.INFECT_REWARD_IMAGE_URL,
        Defaults.INFECT_REWARD_POINTS,
        /* managed= */ true
    )
    let declareRewardData = FakeRewardUtils.createReward(
        Defaults.DECLARE_REWARD_SHORT_NAME,
        Defaults.DECLARE_REWARD_LONG_NAME,
        Defaults.DECLARE_REWARD_DESCRIPTION,
        Defaults.DECLARE_REWARD_IMAGE_URL,
        Defaults.DECLARE_REWARD_POINTS,
        /* managed= */ true
    )
    infectRewardData.id = fakeDatabase.idGenerator.generateId("reward", "infect");
    declareRewardData.id = fakeDatabase.idGenerator.generateId("reward", "declare");
    fakeDatabase.setReward(game.id, infectRewardData.id, infectRewardData)
    fakeDatabase.setReward(game.id, declareRewardData.id, declareRewardData)
    game.infectRewardId = infectRewardData.id
}

/* Creates a group with no owners because the server is the manager. */
FakeRewardUtils.createReward = function (shortName, longName, description, imageUrl, points, managed) {
    return new Reward({
        shortName: shortName,
        longName: longName,
        description: description,
        imageUrl: imageUrl,
        points: points,
        managed: managed
    });
}

