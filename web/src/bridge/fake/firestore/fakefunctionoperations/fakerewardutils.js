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

FakeRewardUtils.createReward = function (shortName, longName, description, imageUrl, points, managed) {
    return new Reward({
        shortName: shortName,
        longName: longName,
        description: description,
        imageUrl: imageUrl,
        points: points,
        managed: managed,
        claimCodes: {}
    });
}

FakeRewardUtils.createRewardClaimCode = function (code) {
    return new ClaimCode({
        code: code,
    });
}

FakeRewardUtils.giveRewardForInfecting = function (fakeDatabase, gameId, infectorPlayerId, timestamp) {
    let infectRewardCode = fakeDatabase.idGenerator.newClaimId(Defaults.INFECT_REWARD_SHORT_NAME, FakeRewardUtils.sanitizePlayerId(infectorPlayerId));
    infectRewardCode = FakeRewardUtils.normalizeLifeCode(infectRewardCode)
    return FakeRewardUtils.redeemRewardCode(fakeDatabase, gameId, infectorPlayerId, infectRewardCode, timestamp)
}

FakeRewardUtils.normalizeLifeCode = function (rawText) {
    let processedCode = rawText.trim()
    processedCode = processedCode.toLowerCase()
    processedCode = processedCode.split(' ').join('-')
    return processedCode
}

FakeRewardUtils.redeemRewardCode = function (fakeDatabase, gameId, playerId, claimCode, timestamp) {
    // Check if claim code is associated with valid reward.
    const shortName = FakeRewardUtils.extractShortNameFromCode(claimCode)
    let rewards = fakeDatabase.getAllRewardsForGame(gameId);
    let rewardToClaim;
    for (let reward of rewards) {
        if (reward[RewardPath.FIELD__SHORT_NAME] == shortName) {
            rewardToClaim = reward;
        }
    }
    if (!rewardToClaim) {
        console.log("No reward found with short name " + shortName + ", not granting reward...")
        return;
    }
    // If the middle code matches the player id then this is a reward we're granting them. Let it be so.
    const secondCode = FakeRewardUtils.extractPlayerIdFromCode(claimCode)
    if (secondCode === FakeRewardUtils.sanitizePlayerId(playerId).toLowerCase()) {
        let claimCodeObject = FakeRewardUtils.createRewardClaimCode(claimCode)
        claimCodeObject.id = fakeDatabase.idGenerator.newRewardCategoryId();
        fakeDatabase.setClaimCode(gameId, rewardToClaim.id, claimCodeObject.id, claimCodeObject);
    }
    let rewardClaimCodes = fakeDatabase.getAllClaimCodesForReward(gameId, rewardToClaim.id);
    let claimCodeToClaim;
    for (let rewardClaimCode of rewardClaimCodes) {
        if (rewardClaimCode[RewardPath.FIELD__CLAIM_CODE_CODE] == claimCode && !rewardClaimCode[RewardPath.FIELD__CLAIM_CODE_REDEEMER]) {
            claimCodeToClaim = rewardClaimCode;
        }
    }
    if (!claimCodeToClaim) {
        console.log("No unclaimed code that matches " + ClaimCode + ", not granting reward...")
        return;
    }
    claimCodeToClaim[RewardPath.FIELD__CLAIM_CODE_REDEEMER] = playerId;
    claimCodeToClaim[RewardPath.FIELD__CLAIM_CODE_TIMESTAMP] = timestamp
    let player = fakeDatabase.getPlayer(gameId, playerId);
    player[PlayerPath.FIELD__POINTS] += rewardToClaim[RewardPath.FIELD__POINTS]
    if (player[PlayerPath.FIELD__REWARDS][rewardToClaim.id]) {
        player[PlayerPath.FIELD__REWARDS][rewardToClaim.id] += 1
    } else {
        player[PlayerPath.FIELD__REWARDS][rewardToClaim.id] = 1
    }
}


FakeRewardUtils.sanitizePlayerId = function (playerId) {
    return playerId.split('-').join('')
}

FakeRewardUtils.extractShortNameFromCode = function (claimCode) {
    return claimCode.split("-", 1)[0]
}

FakeRewardUtils.extractPlayerIdFromCode = function (claimCode) {
    return claimCode.split("-", 2)[1]
}
