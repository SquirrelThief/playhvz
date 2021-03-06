// Copyright 2017 Google Inc.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

/** This file calls all the bridge functions to set up a fake game and fake data. */

function makePlayerProperties(id, userId, gameId, time, name) {
  let player = new Player({
    id: id,
    name: name,
    userId: userId,
    avatarUrl: PlayerUtils.getDefaultProfilePic(name),
    allegiance: Defaults.defaultAllegiance,
  })
  return player;
}

function populatePlayers(bridge, gameId, gameStartOffset, numPlayers, numStartingZombies, numRevivesPerDay, numDays, numShuffles, timeBetweenInfections) {
  let zombiesStartIndex = 0;
  let zombiesEndIndex = numStartingZombies;
  let lifeCodeNumber = 1001;

  // For console logging only
  let numHumans = 0;
  let numZombies = numStartingZombies;

  // Make that many players, start that many of them as zombies, and simulate that
  // many days. In each of the days, each zombie infects a human.
  // Should end in zombiesEndIndex*(2^numDays) zombies.
  let playerIds = [];
  for (let i = 0; i < numPlayers; i++) {
    let userId = bridge.idGenerator.newUserId();
    bridge.register({ userId: userId });
    let playerId = bridge.idGenerator.newPublicPlayerId();
    bridge.createPlayer(makePlayerProperties(playerId, userId, gameId, gameStartOffset, 'Player' + i));
    playerIds.push(playerId);
  }
  playerIds = Utils.deterministicShuffle(playerIds, numShuffles);
  let lifeCodesByPlayerId = {};
  for (let i = 0; i < zombiesEndIndex; i++) {
    bridge.joinHorde({
      gameId: gameId,
      playerId: playerIds[i],
    });
  }
  for (let i = zombiesEndIndex; i < playerIds.length; i++) {
    let lifeCode = "life-" + lifeCodeNumber++;
    lifeCodesByPlayerId[playerIds[i]] = lifeCode;

    bridge.joinResistance({
      gameId: gameId,
      playerId: playerIds[i],
      lifeId: bridge.idGenerator.newPublicLifeId(),
      privateLifeId: bridge.idGenerator.newPrivateLifeId(),
      lifeCode: lifeCode,
    });
    // console.log("Adding first life to player", playerIds[i]);
    numHumans++;
  }
  // console.log(bridge.inner.time, numHumans, numZombies);
  for (let dayIndex = 0; dayIndex < numDays; dayIndex++) {
    let dayStartOffset = gameStartOffset + dayIndex * 24 * 60 * 60 * 1000; // 24 hours
    bridge.setRequestTimeOffset(dayStartOffset);
    for (let j = zombiesStartIndex; j < zombiesEndIndex; j++) {
      let infectorId = playerIds[j];
      let victimId = playerIds[zombiesEndIndex + j];
      let victimLifeCode = lifeCodesByPlayerId[victimId];
      let infectionTimeOffset = dayStartOffset + (j + 1) * timeBetweenInfections; // infections are spread by 11 minutes
      // console.log('infecting', victimId, 'at', infectionTimeOffset);
      bridge.setRequestTimeOffset(infectionTimeOffset);
      bridge.infect({
        gameId: gameId,
        infectionId: bridge.idGenerator.newInfectionId(),
        infectorPlayerId: infectorId,
        victimLifeCode: victimLifeCode,
        victimPlayerId: null
      });
      // console.log("At", bridge.inner.time, "humans:", --numHumans, "zombies:", ++numZombies);
    }
    zombiesEndIndex *= 2;

    if (dayIndex == 0) {
      // End of each day, revive some humans
      for (let j = zombiesStartIndex; j < zombiesStartIndex + numRevivesPerDay; j++) {
        let lifeCode = "life-" + lifeCodeNumber++;
        lifeCodesByPlayerId[playerIds[j]] = lifeCode;
        let reviveTimeOffset = dayStartOffset + 12 * 60 * 60 * 1000; // 12 hours past day start
        bridge.setRequestTimeOffset(reviveTimeOffset);
        // console.log('reviving', playerIds[j], 'at', reviveTimeOffset);
        bridge.addLife({
          gameId: gameId,
          lifeId: bridge.idGenerator.newPublicLifeId(),
          privateLifeId: null,
          playerId: playerIds[j],
          lifeCode: lifeCode
        });
        // console.log("At", bridge.inner.time, "humans:", ++numHumans, "zombies:", --numZombies);
      }
      zombiesStartIndex += numRevivesPerDay;
    }
  }
}

function populatePlayersLight(bridge, gameId, gameStartOffset) {
  populatePlayers(bridge, gameId, gameStartOffset, 20, 2, 2, 2, 3, 60 * 60 * 1000);
}

function populatePlayersHeavy(bridge, gameId, gameStartOffset) {
  populatePlayers(bridge, gameId, gameStartOffset, 300, 7, 6, 5, 3, 11 * 60 * 1000);
}

/************************************************************************
 * START OF FUNCTIONS FOR POPULATING FAKE SERVER (for fake-app.html).
 ************************************************************************/

const Users = {
  ZEKE: "zeke",
  DRAKE: "drake",
  REGGIE: "reggie",
  MINNY: "minny",
  MOLDAVI: "moldavi",
  JACK: "jack",
  DECKERD: "deckerd",
  ZELLA: "zella",
};

class Populator {
  constructor() { }
  players = {
    [Users.ZELLA]: {
      userId: null, // Will be set during init
      userName: Users.ZELLA,
      playerId: null, // Will be set during init
      playerName: "ZellaTheUltimate",
      startAllegiance: Defaults.HUMAN_ALLEGIANCE_FILTER
    },
    [Users.ZEKE]: {
      userId: null,
      userName: Users.ZEKE,
      playerId: null,
      playerName: "Zeke",
      startAllegiance: Defaults.HUMAN_ALLEGIANCE_FILTER
    },
    [Users.DRAKE]: {
      userId: null,
      userName: Users.DRAKE,
      playerId: null,
      playerName: "Drackan",
      startAllegiance: Defaults.ZOMBIE_ALLEGIANCE_FILTER
    },
    [Users.REGGIE]: {
      userId: null,
      userName: Users.REGGIE,
      playerId: null,
      playerName: null, // Skipping creating a player initially
      startAllegiance: null
    },
    [Users.MINNY]: {
      userId: null,
      userName: Users.MINNY,
      playerId: null,
      playerName: null, // Skipping creating a player initially
      startAllegiance: null
    },
    [Users.MOLDAVI]: {
      userId: null,
      userName: Users.MOLDAVI,
      playerId: null,
      playerName: "MoldaviTheMoldavish",
      startAllegiance: Defaults.HUMAN_ALLEGIANCE_FILTER
    },
    [Users.JACK]: {
      userId: null,
      userName: Users.JACK,
      playerId: null,
      playerName: "JackSlayerTheBeanSlasher",
      startAllegiance: Defaults.HUMAN_ALLEGIANCE_FILTER
    },
    [Users.DECKERD]: {
      userId: null,
      userName: Users.DECKERD,
      playerId: null,
      playerName: "DeckerdTheHesitant",
      startAllegiance: null // Start with the default allegiance
    }
  }
  /** Function used by fake-app.html to populate user data. */
  async populateUsers(bridge) {
    let userIds = {};
    for (let userName of Object.values(Users)) {
      let userId = await bridge.signIn({ userName: userName })
      this.players[userName].userId = userId;
      userIds[userName] = userId;
    }
    return userIds;
  }

  async populateFakeAppPlayers(bridge, gameName, gameId) {
    for (let userName of Object.values(Users)) {
      let playerName = this.players[userName].playerName
      if (playerName == null) {
        // This user doesn't start with a player in the game, skip them.
        continue;
      }
      // Sign in so that all the firebase commands we run are run for the current user.
      await bridge.signIn({ userName: userName });
      let playerId = (await bridge.joinGame(gameName, playerName)).playerId;
      if (!playerId) {
        // Failed to join game because this player already exists, just get the player id
        let userId = this.players[userName].userId
        playerId = (await bridge.getPlayerByUserId(userId, gameId)).id;
      }
      this.players[userName].playerId = playerId;
      if (this.players[userName].startAllegiance) {
        // If player should start with a certain allegiance, set it.
        await bridge.changePlayerAllegiance(gameId, playerId, this.players[userName].startAllegiance)
        // Grant the player a reward as if they declared their allegiance through the quiz.
        await bridge.redeemRewardCode(this.gameId, playerId, "declare-" + playerId + "-" + new Date().getTime());
      }
    }
  }

  /** Function used by fake-app.html to populate game data. */
  async populateGame(bridge, gameId, config, populateLotsOfPlayers) {
    // Setup the initial game
    let gameStartOffset = - 6 * 24 * 60 * 60 * 1000; // 6 days ago
    bridge.setRequestTimeOffset(gameStartOffset);
    let gameName = "Test game"
    this.gameId = await bridge.createGame(
    /* creatorUserId= */ this.zellaUserId,
    /* name= */ gameName,
    /* startTime= */ new Date().getTime(),
    /* endTime= */ new Date().getTime() + (1 * 86400 * 1000) // today + 1 day
    );
    if (!this.gameId) {
      // The game already exists, get the id.
      this.gameId = await bridge.checkGameExists(gameName);
      // Actually, we can just exit. If you want to run this anyway then remove this line.
      return;
    }
    await this.populateFakeAppPlayers(bridge, gameName, this.gameId);
    await bridge.signIn({ userName: Users.ZELLA });
    await bridge.updateGameRules(this.gameId, RULES);
    await bridge.updateGameFaq(this.gameId, FAQ);

    // Initialize chat rooms with some data
    let globalChatRoomId = "";
    let resistanceChatRoomId = "";
    let hordeChatRoomId = "";
    let adminChatRoomId = "";
    let chatRooms = await bridge.getAllChatsInGame(this.gameId);
    for (let chatRoom of chatRooms) {
      if (chatRoom.name === Defaults.globalChatName) {
        globalChatRoomId = chatRoom.id;
      } else if (chatRoom.name === Defaults.globalHumanChatName) {
        resistanceChatRoomId = chatRoom.id;
      } else if (chatRoom.name === Defaults.globalZombieChatName) {
        hordeChatRoomId = chatRoom.id;
      } else if (chatRoom.name === Defaults.gameAdminChatName) {
        adminChatRoomId = chatRoom.id;
      }
    }
    // Set admin players
    let adminChatRoom = await bridge.getChatRoomOnce(this.gameId, adminChatRoomId);
    await bridge.addPlayersToGroup(this.gameId, adminChatRoom.associatedGroupId, [this.players[Users.MOLDAVI].playerId]);

    /*
    // TODO: add support for this to firestore
      bridge.addDefaultProfileImage({
        gameId: gameId,
        defaultProfileImageId: bridge.idGenerator.newGroupId(),
        allegianceFilter: 'resistance',
        profileImageUrl: 'http://dfwresistance.us/images/resistance-dfw-icon.png',
      });
      bridge.addDefaultProfileImage({
        gameId: gameId,
        defaultProfileImageId: bridge.idGenerator.newGroupId(),
        allegianceFilter: 'resistance',
        profileImageUrl: 'https://cdn.vectorstock.com/i/thumb-large/03/81/1890381.jpg',
      });
      bridge.addDefaultProfileImage({
        gameId: gameId,
        defaultProfileImageId: bridge.idGenerator.newGroupId(),
        allegianceFilter: 'horde',
        profileImageUrl: 'https://goo.gl/DP2vlY',
      });
      bridge.addDefaultProfileImage({
        gameId: gameId,
        defaultProfileImageId: bridge.idGenerator.newGroupId(),
        allegianceFilter: 'horde',
        profileImageUrl: 'https://cdn4.iconfinder.com/data/icons/miscellaneous-icons-3/200/monster_zombie_hand-512.png',
      });
    */
    await bridge.sendChatMessage(this.gameId, bridge.idGenerator.newMessageId(), globalChatRoomId, this.players[Users.ZELLA].playerId, 'Hello World!');
    await bridge.sendChatMessage(this.gameId, bridge.idGenerator.newMessageId(), globalChatRoomId, this.players[Users.ZEKE].playerId, 'What up?');
    await bridge.sendChatMessage(this.gameId, bridge.idGenerator.newMessageId(), resistanceChatRoomId, this.players[Users.ZELLA].playerId, 'yo dawg i hear the zeds r comin!');
    await bridge.sendChatMessage(this.gameId, bridge.idGenerator.newMessageId(), resistanceChatRoomId, this.players[Users.ZEKE].playerId, 'they are hereeee!!');
    await bridge.sendChatMessage(this.gameId, bridge.idGenerator.newMessageId(), adminChatRoomId, this.players[Users.ZELLA].playerId, 'FOR GLORY!');
    await bridge.sendChatMessage(this.gameId, bridge.idGenerator.newMessageId(), resistanceChatRoomId, this.players[Users.MOLDAVI].playerId, 'yee!');
    await bridge.sendChatMessage(this.gameId, bridge.idGenerator.newMessageId(), resistanceChatRoomId, this.players[Users.MOLDAVI].playerId, 'man what i would do for some garlic rolls!');
    await bridge.sendChatMessage(this.gameId, bridge.idGenerator.newMessageId(), resistanceChatRoomId, this.players[Users.MOLDAVI].playerId, 'https://www.youtube.com/watch?v=GrHPTWTSFgc');
    await bridge.sendChatMessage(this.gameId, bridge.idGenerator.newMessageId(), resistanceChatRoomId, this.players[Users.JACK].playerId, 'yee!');
    await bridge.sendChatMessage(this.gameId, bridge.idGenerator.newMessageId(), resistanceChatRoomId, this.players[Users.JACK].playerId, 'yee!');
    await bridge.sendChatMessage(this.gameId, bridge.idGenerator.newMessageId(), resistanceChatRoomId, this.players[Users.MOLDAVI].playerId, 'yee!');
    await bridge.sendChatMessage(this.gameId, bridge.idGenerator.newMessageId(), resistanceChatRoomId, this.players[Users.JACK].playerId, 'yee!');

    // Infect somebody! This will move them from the Human chat to the Zombie chat
    let zekePlayerData = await bridge.getPlayerOnce(this.gameId, this.players[Users.ZEKE].playerId);
    let lifeCode = ""
    for (let [key, value] of Object.entries(zekePlayerData[PlayerPath.FIELD__LIVES])) {
      // Return the first valid lifecode we can use to infect.
      if (value.isActive) {
        lifeCode = key;
        break;
      }
    }
    await bridge.infectPlayerByLifeCode(this.gameId, /* infectorPlayerId= */ this.players[Users.DRAKE].playerId, lifeCode);
    await bridge.sendChatMessage(this.gameId, bridge.idGenerator.newMessageId(), hordeChatRoomId, this.players[Users.ZEKE].playerId, 'zeds rule!');
    await bridge.sendChatMessage(this.gameId, bridge.idGenerator.newMessageId(), hordeChatRoomId, this.players[Users.DRAKE].playerId, 'hoomans drool!');
    await bridge.sendChatMessage(this.gameId, bridge.idGenerator.newMessageId(), hordeChatRoomId, this.players[Users.DRAKE].playerId, 'monkeys eat stool!');

    let secondZedChatRoomName = "Zeds Internal Secret Police"
    let secondZedChatRoom = await bridge.getChatRoomByName(this.gameId, secondZedChatRoomName)
    if (secondZedChatRoom == null) {
      // Database doesn't contain this chat, so create it. Otherwise we've been lazy and haven't cleared the database from last run.
      await bridge.createChatRoom(this.gameId, this.players[Users.ZEKE].playerId, secondZedChatRoomName, /* allegianceFilter= */ "horde");
      secondZedChatRoom = await bridge.getChatRoomByName(this.gameId, secondZedChatRoomName)
    }
    await bridge.addPlayersToChat(this.gameId, secondZedChatRoom.associatedGroupId, secondZedChatRoom.id, [this.players[Users.ZEKE].playerId, this.players[Users.DRAKE].playerId]);
    await bridge.sendChatMessage(this.gameId, bridge.idGenerator.newMessageId(), secondZedChatRoom.id, this.players[Users.DRAKE].playerId, 'lololol we be zed police');
    await bridge.sendChatMessage(this.gameId, bridge.idGenerator.newMessageId(), secondZedChatRoom.id, this.players[Users.ZEKE].playerId, 'lololol oink oink');

    let secondHumanChatRoomName = "My Chat Room!"
    let secondHumanChatRoom = await bridge.getChatRoomByName(this.gameId, secondHumanChatRoomName)
    if (secondHumanChatRoom == null) {
      // Database doesn't contain this chat, so create it. Otherwise we've been lazy and haven't cleared the database from last run.
      await bridge.createChatRoom(this.gameId, this.players[Users.ZELLA].playerId, secondHumanChatRoomName, /* allegianceFilter= */ "resistance");
      secondHumanChatRoom = await bridge.getChatRoomByName(this.gameId, secondHumanChatRoomName)
    }
    await bridge.addPlayersToChat(this.gameId, secondHumanChatRoom.associatedGroupId, secondHumanChatRoom.id, [this.players[Users.ZELLA].playerId, this.players[Users.JACK].playerId]);
    await bridge.sendChatMessage(this.gameId, bridge.idGenerator.newMessageId(), secondHumanChatRoom.id, this.players[Users.ZELLA].playerId, 'lololol i have a chat room!');


    /*
      bridge.updatePlayer({
        gameId: gameId,
        playerId: zellaPlayerId,
        avatarUrl: 'https://lh3.googleusercontent.com/GoKTAX0zAEt6PlzUkTn7tMeK-q1hwKDpzWsMJHBntuyR7ZKVtFXjRkbFOEMqrqxPWJ-7dbCXD7NbVgHd7VmkYD8bDzsjd23XYk0KyALC3BElIk65vKajjjRD_X2_VkLPOVejrZLpPpa2ebQVUHJF5UXVlkst0m6RRqs2SumRzC7EMmEeq9x_TurwKUJmj7PhNBPCeoDEh51jAIc-ZqvRfDegLgq-HtoyJAo91lbD6jqA2-TFufJfiPd4nOWnKhZkQmarxA8LQT0kOu7r3M5F-GH3pCbQqpH1zraha8CqvKxMGLW1i4CbDs1beXatKTdjYhb1D_MVnJ6h7O4WX3GULwNTRSIFVOrogNWm4jWLMKfKt3NfXYUsCOMhlpAI3Q8o1Qgbotfud4_HcRvvs6C6i17X-oQm8282rFu6aQiLXOv55FfiMnjnkbTokOA1OGDQrkBPbSVumz9ZE3Hr-J7w_G8itxqThsSzwtK6p5YR_9lnepWe0HRNKfUZ2x-a2ndT9m6aRXC_ymWHQGfdGPvTfHOPxUpY8mtX2vknmj_dn4dIuir1PpcN0DJVVuyuww3sOn-1YRFh80gBFvwFuMnKwz8GY8IX5gZmbrrBsy_FmwFDIvBcwNjZKd9fH2gkK5rk1AlWv12LsPBsrRIEaLvcSq7Iim9XSsiivzcNrLFG=w294-h488-no'
      });
      bridge.updatePlayer({
        gameId: gameId,
        playerId: drakePlayerId,
        avatarUrl: 'https://lh3.googleusercontent.com/WP1fewVG0CvERcnQnmxjf84IjnEBoDQBgdaxbNAECRa433neObfAjv_xI35DN67WhcCL9y-mgXmfYrZEBeJ2PYrtIeCK3KSdJ4HiEDUqxaaGsJAtu5C5ZjcABUHoySueEwO0yJWfhWPVbGoAFdP-ZquoXSF3yz4gnlN76W-ltDBglclLxKs-hR9dTjf_DiX9yGmmb5y8mp1Jb8BEw9Q-zx_j9EFkgTI0EA6T10pogxsfAWkrwXO7t37D0vI2OxzHJA51EQ4LZw1oZsIN7Uyqnh06LAJ_ykYhW2xuSCpu7QY7UPm9IbDcsDqj1eap7xvV9JW_EW2Y8Km5nS0ZoAd-Eo3zUe-2YFTc0OAVDwgbhowzo1gUeqfCEtxVHuT36Aq2LWayB6DzOL9TqubcF7qmjtNy_UIr-RY1d69xN-KqjFBoWLtS6rDhQurrfJNd5x-MYOEjCMrbsGmSXE8L7PskM3e_3-ZhIqfMn2I-4zeEZIUG8U2iHRWK-blaqsSY8uhmzNG6sqF-liyINagQF4l35oy7tpobueWs7aDjRrcJrGiQDrGHYV1E67J64Ae9FqXPHmORRpYcihQc6pI0JAmaiWwMJoqD0QMJF9koaDYANPEGbWlnWc_lFzhCO_L8yCkVtJIIItQv-loypR6XqILK32eoGeatnp5Q0x0OEm3W=s240-no'
      });
      bridge.updatePlayer({
        gameId: gameId,
        playerId: zekePlayerId,
        avatarUrl: 'https://s-media-cache-ak0.pinimg.com/736x/31/92/2e/31922e8b045a7ada368f774ce34e20c0.jpg'
      });
      bridge.updatePlayer({
        gameId: gameId,
        playerId: moldaviPlayerId,
        avatarUrl: 'https://katiekhau.files.wordpress.com/2012/05/scan-9.jpeg'
      });
      bridge.updatePlayer({
        gameId: gameId,
        playerId: jackPlayerId,
        avatarUrl: 'https://sdl-stickershop.line.naver.jp/products/0/0/1/1009925/android/main.png'
      });
    
      var resistanceMapId = bridge.idGenerator.newMapId();
      bridge.createMap({ gameId: gameId, requestTrackingUntil: new Date().getTime() + gameStartOffset, mapId: resistanceMapId, accessGroupId: resistanceGroupId, name: "Resistance Players" });
      bridge.addMarker({ gameId: gameId, markerId: bridge.idGenerator.newMarkerId(), name: "First Tower", color: "FF00FF", playerId: null, mapId: resistanceMapId, latitude: 37.423734, longitude: -122.092054 });
      bridge.addMarker({ gameId: gameId, markerId: bridge.idGenerator.newMarkerId(), name: "Second Tower", color: "00FFFF", playerId: null, mapId: resistanceMapId, latitude: 37.422356, longitude: -122.088078 });
      bridge.addMarker({ gameId: gameId, markerId: bridge.idGenerator.newMarkerId(), name: "Third Tower", color: "FFFF00", playerId: null, mapId: resistanceMapId, latitude: 37.422757, longitude: -122.081984 });
      bridge.addMarker({ gameId: gameId, markerId: bridge.idGenerator.newMarkerId(), name: "Fourth Tower", color: "FF8000", playerId: null, mapId: resistanceMapId, latitude: 37.420382, longitude: -122.083884 });
    
      if (populateLotsOfPlayers) {
        populatePlayersHeavy(bridge, gameId, gameStartOffset);
      } else {
        populatePlayersLight(bridge, gameId, gameStartOffset);
      }
    */

    let humanMissionName = "First Human Mission!";
    let humanMission = await bridge.getMissionByName(this.gameId, humanMissionName);
    if (humanMission == null) {
      // We're in a fresh database that doesn't already have this mission.
      await bridge.createMission(
        this.gameId,
        humanMissionName,
    /* startTime= */ new Date().getTime() - 10 * 1000,
    /* endTime= */ new Date().getTime() + 60 * 60 * 1000,
    /* details= */ HUMAN_MISSION_MARKDOWN,
        "resistance"
      );
    }

    let zedMissionName = "First Zed Mission!";
    let zedMission = await bridge.getMissionByName(this.gameId, zedMissionName);
    if (zedMission == null) {
      // We're in a fresh database that doesn't already have this mission.
      await bridge.createMission(
        this.gameId,
        zedMissionName,
    /* startTime= */ new Date().getTime() + 60 * 60 * 1000,
    /* endTime= */ new Date().getTime() + 120 * 60 * 1000,
    /* details= */ ZOMBIE_MISSION_MARKDOWN,
        "horde"
      );
    }

    // Create rewards
    await bridge.createReward(this.gameId, /* shortName= */ "signed", /* longName= */ "signed up!", /* description= */ 'signed up for the game!', 'https://maxcdn.icons8.com/Share/icon/ultraviolet/Baby//nerf_gun1600.png', /* points= */ 2)
    let signInRewardId = (await bridge.getRewardByShortName(this.gameId, "signed")).id;
    await bridge.createReward(this.gameId, /* shortName= */ "didthing", "did the thing!", 'soooo did the thing!', 'https://s-media-cache-ak0.pinimg.com/originals/94/9b/80/949b80956f246b74dc1f4f1f476eb9c1.png', /* points= */ 2)
    let didTheThingRewardId = (await bridge.getRewardByShortName(this.gameId, "didthing")).id;
    await bridge.createReward(this.gameId, /* shortName= */ "foundleaf", "found a leaf!", 'i found a leaf when my allies were being ambushed!', 'http://static.tumblr.com/87e20377c9c37d0b07dcc10504c636a8/mteq5q3/k1Ynitn6h/tumblr_static_75lgqkjlvcw00cos8g8kko80k.png', /* points= */ 2)
    let leafRewardId = (await bridge.getRewardByShortName(this.gameId, "foundleaf")).id;
    await bridge.createReward(this.gameId, /* shortName= */ "knowgeno", "i know geno!", 'i know who geno is!', 'http://vignette2.wikia.nocookie.net/nintendo/images/0/02/Geno_Artwork_%28Super_Mario_RPG_-_Legend_of_the_Seven_Stars%29.png/revision/latest?cb=20121110130550&path-prefix=en', /* points= */ 2)
    let genoRewardId = (await bridge.getRewardByShortName(this.gameId, "knowgeno")).id;

    // Generate claim codes for the rewards we just created.
    // Codes are of the form: <short name>-claim-# 
    await bridge.generateClaimCodes(this.gameId, signInRewardId, /* numCodes= */ 3);
    await bridge.generateClaimCodes(this.gameId, didTheThingRewardId, /* numCodes= */ 1);
    await bridge.generateClaimCodes(this.gameId, leafRewardId, /* numCodes= */ 1);
    await bridge.generateClaimCodes(this.gameId, genoRewardId, /* numCodes= */ 1);

    let signInRewardClaimCodes = await bridge.getAvailableClaimCodes(this.gameId, signInRewardId);
    let didThingRewardClaimCodes = await bridge.getAvailableClaimCodes(this.gameId, didTheThingRewardId);
    let leafRewardClaimCodes = await bridge.getAvailableClaimCodes(this.gameId, leafRewardId);
    let genoRewardClaimCodes = await bridge.getAvailableClaimCodes(this.gameId, genoRewardId);

    await bridge.redeemRewardCode(this.gameId, this.players[Users.DRAKE].playerId, signInRewardClaimCodes[0]);
    await bridge.redeemRewardCode(this.gameId, this.players[Users.DRAKE].playerId, didThingRewardClaimCodes[0]);
    await bridge.redeemRewardCode(this.gameId, this.players[Users.DRAKE].playerId, leafRewardClaimCodes[0]);
    await bridge.redeemRewardCode(this.gameId, this.players[Users.DRAKE].playerId, genoRewardClaimCodes[0]);

    let jackAndAdminChatRoomId = await bridge.createOrGetChatWithAdmin(this.gameId, this.players[Users.JACK].playerId);
    await bridge.sendChatMessage(this.gameId, bridge.idGenerator.newMessageId(), jackAndAdminChatRoomId, this.players[Users.JACK].playerId, 'Are there traitor humans in this game?');

    // Populate the declare allegiance quiz
    await bridge.addQuizQuestion(this.gameId, QUIZ_QUESTION_1);
    await bridge.addQuizQuestion(this.gameId, QUIZ_QUESTION_2);
    await bridge.addQuizQuestion(this.gameId, QUIZ_QUESTION_3);
    await bridge.addQuizQuestion(this.gameId, QUIZ_QUESTION_4);

    console.log("Finished populating game.")
    // TODO: SUPPORT THINGS BELOW THIS POINT.
    return;
    /*
      bridge.queueNotification({
        gameId: gameId,
        queuedNotificationId: bridge.idGenerator.newQueuedNotificationId(),
        previewMessage: "Mission 1 Details: the zeds have invaded!",
        message: "oh god theyre everywhere run",
        sendTime: null,
        groupId: resistanceGroupId,
        playerId: null,
        email: true,
        site: true,
        mobile: true,
        vibrate: true,
        sound: "ping.wav",
        destination: "missions/" + firstMissionId,
        icon: null
      });
    
      let requestCategoryId = bridge.idGenerator.newRequestCategoryId();
      let requestId = bridge.idGenerator.newRequestId();
      bridge.addRequestCategory({
        gameId: gameId,
        requestCategoryId: requestCategoryId,
        chatRoomId: resistanceChatRoomId,
        playerId: moldaviPlayerId,
        text: 'yee?',
        type: 'ack',
        dismissed: false
      });
      bridge.addRequest({
        gameId: gameId,
        requestId: requestId,
        requestCategoryId: requestCategoryId,
        playerId: jackPlayerId
      });
      bridge.addRequest({
        gameId: gameId,
        requestId: bridge.idGenerator.newRequestId(),
        requestCategoryId: requestCategoryId,
        playerId: zellaPlayerId
      });
      bridge.addResponse({
        gameId: gameId,
        requestId: requestId,
        text: null
      });
      bridge.updateRequestCategory({
        gameId: gameId,
        requestCategoryId: requestCategoryId,
        dismissed: true,
      });
    
      let secondRequestCategoryId = bridge.idGenerator.newRequestCategoryId();
      let secondRequestId = bridge.idGenerator.newRequestId();
      bridge.addRequestCategory({
        gameId: gameId,
        requestCategoryId: secondRequestCategoryId,
        chatRoomId: resistanceChatRoomId,
        playerId: moldaviPlayerId,
        text: 'yee2?',
        type: 'ack',
        dismissed: false
      });
      bridge.addRequest({
        gameId: gameId,
        requestId: secondRequestId,
        requestCategoryId: secondRequestCategoryId,
        playerId: jackPlayerId
      });
      bridge.addRequest({
        gameId: gameId,
        requestId: bridge.idGenerator.newRequestId(),
        requestCategoryId: secondRequestCategoryId,
        playerId: zellaPlayerId
      });
      bridge.addResponse({
        gameId: gameId,
        requestId: secondRequestId,
        text: null
      });
    
      let textRequestCategoryId = bridge.idGenerator.newRequestCategoryId();
      let textRequestId = bridge.idGenerator.newRequestId();
      bridge.addRequestCategory({
        gameId: gameId,
        requestCategoryId: textRequestCategoryId,
        chatRoomId: resistanceChatRoomId,
        playerId: moldaviPlayerId,
        text: 'text?',
        type: 'text',
        dismissed: false
      });
      bridge.addRequest({
        gameId: gameId,
        requestId: textRequestId,
        requestCategoryId: textRequestCategoryId,
        playerId: jackPlayerId
      });
      bridge.addRequest({
        gameId: gameId,
        requestId: bridge.idGenerator.newRequestId(),
        requestCategoryId: textRequestCategoryId,
        playerId: zellaPlayerId
      });
      bridge.addResponse({
        gameId: gameId,
        requestId: textRequestId,
        text: "responseText",
      });
    
      populateQuiz(bridge, gameId); */
  }

  /************************************************************************
   * END(?) OF FUNCTIONS FOR POPULATING FAKE SERVER.
   ************************************************************************/


  populateQuiz(bridge, gameId) {
    let stunQuestionId = bridge.idGenerator.newQuizQuestionId();
    bridge.addQuizQuestion({
      quizQuestionId: stunQuestionId, gameId: gameId,
      text: "When you're a zombie, and a human shoots you with a nerf dart, what do you do?",
      type: 'order',
      number: 0,
    });
    bridge.addQuizAnswer({
      quizAnswerId: bridge.idGenerator.newQuizAnswerId(), quizQuestionId: stunQuestionId, gameId: gameId,
      text: "Crouch/sit down,",
      order: 0,
      isCorrect: true,
      number: 0,
    });
    bridge.addQuizAnswer({
      quizAnswerId: bridge.idGenerator.newQuizAnswerId(), quizQuestionId: stunQuestionId, gameId: gameId,
      text: "For 50 seconds, don't move from your spot (unless safety requires it),",
      order: 1,
      isCorrect: true,
      number: 1,
    });
    bridge.addQuizAnswer({
      quizAnswerId: bridge.idGenerator.newQuizAnswerId(), quizQuestionId: stunQuestionId, gameId: gameId,
      text: "Count aloud \"10, 9, 8, 7, 6, 5, 4, 3, 2, 1\",",
      order: 2,
      isCorrect: true,
      number: 2,
    });
    bridge.addQuizAnswer({
      quizAnswerId: bridge.idGenerator.newQuizAnswerId(), quizQuestionId: stunQuestionId, gameId: gameId,
      text: "Stand up, return to mauling humans,",
      order: 3,
      isCorrect: true,
      number: 3,
    });

    let infectQuestionId = bridge.idGenerator.newQuizQuestionId();
    bridge.addQuizQuestion({
      quizQuestionId: infectQuestionId, gameId: gameId,
      text: "When you're a zombie, and you touch a human, what do you do?",
      type: 'order',
      number: 1,
    });
    bridge.addQuizAnswer({
      quizAnswerId: bridge.idGenerator.newQuizAnswerId(), quizQuestionId: infectQuestionId, gameId: gameId,
      text: "Crouch/sit down,",
      order: 0,
      isCorrect: true,
      number: 0,
    });
    bridge.addQuizAnswer({
      quizAnswerId: bridge.idGenerator.newQuizAnswerId(), quizQuestionId: infectQuestionId, gameId: gameId,
      text: "Ask the human for their life code,",
      order: 1,
      isCorrect: true,
      number: 1,
    });
    bridge.addQuizAnswer({
      quizAnswerId: bridge.idGenerator.newQuizAnswerId(), quizQuestionId: infectQuestionId, gameId: gameId,
      text: "For 50 seconds, don't move from your spot (unless safety requires it),",
      order: 2,
      isCorrect: true,
      number: 2,
    });
    bridge.addQuizAnswer({
      quizAnswerId: bridge.idGenerator.newQuizAnswerId(), quizQuestionId: infectQuestionId, gameId: gameId,
      text: "Count aloud \"10, 9, 8, 7, 6, 5, 4, 3, 2, 1\",",
      order: 3,
      isCorrect: true,
      number: 3,
    });
    bridge.addQuizAnswer({
      quizAnswerId: bridge.idGenerator.newQuizAnswerId(), quizQuestionId: infectQuestionId, gameId: gameId,
      text: "Stand up, return to mauling humans,",
      order: 4,
      isCorrect: true,
      number: 4,
    });

    let crossQuestionId = bridge.idGenerator.newQuizQuestionId();
    bridge.addQuizQuestion({
      quizQuestionId: crossQuestionId, gameId: gameId,
      text: "When you want to cross the street, what do you do?",
      type: 'order',
      number: 2,
    });
    bridge.addQuizAnswer({
      quizAnswerId: bridge.idGenerator.newQuizAnswerId(), quizQuestionId: crossQuestionId, gameId: gameId,
      text: "Get within 15 feet of a crosswalk button (now you're out of play),",
      order: 0,
      isCorrect: true,
      number: 0,
    });
    bridge.addQuizAnswer({
      quizAnswerId: bridge.idGenerator.newQuizAnswerId(), quizQuestionId: crossQuestionId, gameId: gameId,
      text: "Press the crosswalk button,",
      order: 1,
      isCorrect: true,
      number: 1,
    });
    bridge.addQuizAnswer({
      quizAnswerId: bridge.idGenerator.newQuizAnswerId(), quizQuestionId: crossQuestionId, gameId: gameId,
      text: "When the walk signal appears, walk (not run) across the crosswalk,",
      order: 2,
      isCorrect: true,
      number: 2,
    });
    bridge.addQuizAnswer({
      quizAnswerId: bridge.idGenerator.newQuizAnswerId(), quizQuestionId: crossQuestionId, gameId: gameId,
      text: "Wait until there are no more players in the crosswalk,",
      order: 3,
      isCorrect: true,
      number: 3,
    });
    bridge.addQuizAnswer({
      quizAnswerId: bridge.idGenerator.newQuizAnswerId(), quizQuestionId: crossQuestionId, gameId: gameId,
      text: "Have a human count \"3 resistance, 2 resistance, 1 resistance, go!\" and the humans are in play,",
      order: 4,
      isCorrect: true,
      number: 4,
    });
    bridge.addQuizAnswer({
      quizAnswerId: bridge.idGenerator.newQuizAnswerId(), quizQuestionId: crossQuestionId, gameId: gameId,
      text: "When the humans go, have a zombie count \"3 zombie horde, 2 zombie horde, 1 zombie horde, go!\" and the zombies are in play,",
      order: 5,
      isCorrect: true,
      number: 5,
    });
    bridge.addQuizAnswer({
      quizAnswerId: bridge.idGenerator.newQuizAnswerId(), quizQuestionId: crossQuestionId, gameId: gameId,
      text: "Once you're across, count \"3 resistance, 2 resistance, 1 resistance!\" and go,",
      order: 0,
      isCorrect: false,
      number: 6,
    });
    bridge.addQuizAnswer({
      quizAnswerId: bridge.idGenerator.newQuizAnswerId(), quizQuestionId: crossQuestionId, gameId: gameId,
      text: "Count to 15, then take off your armband,",
      order: 0,
      isCorrect: false,
      number: 7,
    });
    bridge.addQuizAnswer({
      quizAnswerId: bridge.idGenerator.newQuizAnswerId(), quizQuestionId: crossQuestionId, gameId: gameId,
      text: "Raise your nerf gun in the air so you're visible,",
      order: 0,
      isCorrect: false,
      number: 8,
    });
    bridge.addQuizAnswer({
      quizAnswerId: bridge.idGenerator.newQuizAnswerId(), quizQuestionId: crossQuestionId, gameId: gameId,
      text: "Start walking across the street, looking both ways for cars,",
      order: 0,
      isCorrect: false,
      number: 9,
    });

    let lyingDownQuestionId = bridge.idGenerator.newQuizQuestionId();
    bridge.addQuizQuestion({
      quizQuestionId: lyingDownQuestionId, gameId: gameId,
      text: "You see somebody lying down, not moving. What should you do?",
      type: 'multipleChoice',
      number: 3,
    });
    bridge.addQuizAnswer({
      quizAnswerId: bridge.idGenerator.newQuizAnswerId(), quizQuestionId: lyingDownQuestionId, gameId: gameId,
      text: "Keep playing",
      order: 0,
      isCorrect: false,
      number: 0,
    });
    bridge.addQuizAnswer({
      quizAnswerId: bridge.idGenerator.newQuizAnswerId(), quizQuestionId: lyingDownQuestionId, gameId: gameId,
      text: "Let an admin know",
      order: 0,
      isCorrect: false,
      number: 1,
    });
    bridge.addQuizAnswer({
      quizAnswerId: bridge.idGenerator.newQuizAnswerId(), quizQuestionId: lyingDownQuestionId, gameId: gameId,
      text: "Check that they’re ok, and call 911/GSOC if they’re unresponsive.",
      order: 0,
      isCorrect: true,
      number: 2,
    });

    bridge.setRequestTimeOffset(0);
    bridge.executeNotifications({});
  }
}

const HUMAN_MISSION_MARKDOWN = `
### TL;DR: Meet at charleston park!

Men and women of the __Stradivarius__! You all know the situation. The zeds have overrun the planet beneath us, and soon they'll overrun every planet in the sector. With the communication tower down, our loved ones back on the planets will certainly be overrun by the zeds.

We are now in geosynchronous orbit above the sector’s communication tower. The area is completely crawling with zeds. Even if ships went down there to fix the tower, the zeds who have taken over the defense systems will shoot them down once they enter the atmosphere, and there’s certainly no chance that any ship will make it back into orbit afterwards.

It's a ~~suicide~~ __*cough*__ noble __*cough*__ mission. But for our families, we do what we must.

Once we get down to the surface, we must meet at the below location, a place the locals once called **Charleston Park**.

<iframe style="width: 100%; height: 300px; border-width: 0;" src="https://www.google.com/maps/d/embed?mid=1_jSfVfafWm3IZ-txxSQ4rcSYrsA&ll=37.42155881938754%2C-122.08218634299163&z=17"></iframe>
`;

const ZOMBIE_MISSION_MARKDOWN = `
### TL;DR: Brns

Barns barns barns barns barns barns barns barns barns barns __barns__ barns barns barns barns barns barns barns barns barns barns barns barns barns barns barns barns barns barns barns barns barns barns barns barns barns barns barns barns barns barns barns barns barns barns barns barns

 barns barns barns barns **barns** barns barns barns **barns** barns barns barns barns barns barns barns barns barns barns barns barns

brans

arbs

<iframe style="width: 100%; height: 300px; border-width: 0;" src="https://www.google.com/maps/d/embed?mid=1_jSfVfafWm3IZ-txxSQ4rcSYrsA&ll=37.42155881938754%2C-122.08218634299163&z=17"></iframe>
`;

const FAQ = [
  {
    order: 0,
    sectionTitle: "How do I play the game?",
    sectionContent: `You should follow the game rules (found under the 'Rules' page). Admins may change rules as the game goes on. 
    Keep an eye out for updates! So long as you follow the rules, you’re free to play however you like, including playing deceptively or lying.
  If any rules conflict with safety, do the safe thing! Additional rules and clarifications might be added before game, send any questions to hvz-cdc@`,
  }
]

const SUMMARY_HTML = `
<b>I am a SUMMARY!</b>
`;

const RULES = [
  {
    order: 0,
    sectionTitle: "Game Identification, Life Code",
    sectionContent: `Each player will be given a strip of pink cloth to identify them as a player, each human will be given a life code.
Humans wear their band visibly on their arm, zombies wear them visibly around their head.
Upon being infected by a zombie, the human gives the zombie their life code.
Moderators will have orange armbands.`,
  },
  {
    order: 1,
    sectionTitle: "Infecting",
    sectionContent: `A Zombie can turn humans to zombies with a firm touch to any part of a Human including anything they are wearing and anything they are holding (unless it is an admin given shield or pool noodle). Please don't tackle!</div>
When infected:
Both players are now zombies, and are stunned for 1 minute.
The zombie must collect the victim's life code, and report the infection on the site as soon as they can.
The victim must move their armband to their head.
The zombies must count the last 10 seconds aloud.
After the minute is up, both players return to the game as zombies.
Zombies may be given pool noodles that act as an extension of their arm, at the discretion of moderators only.
If there is any confusion or dispute, contact the moderator.
There will be 1 mission a day. Miss two consecutive missions and you will automatically become infected. Humans that complete the Friday mission survive the game.`,
  },
  {
    order: 2,
    sectionTitle: "Stunning",
    sectionContent: `Humans can stun ANY player (humans or zombie) for 1 minute by shooting them with a nerf dart, hitting them with a sock they threw, or tagging them with an admin given pool noodle. When stunned, the player must:
When stunned:
Crouch/sit down, and not move from their spot for 1 minute, or sooner (for humans) if unstunned.
Count the last 10 seconds aloud.
When the minute is up, stand up and return to the game. Humans that were stunned by other humans are vulnerable to zombies while waiting to become unstunned (but they can still shoot).
If you have a functionally modded blaster, email hvz-cdc@ to get it approved. Let a moderator know if someone’s blaster is painful.
Don’t stuff things in the socks, just roll them up.
Admins may add more methods of stunning as the game goes on.
Zombies cannot sit down near a human unless the zombie is stunned.
If a stunned player is in an unsafe situation or is inconveniencing non-players, they must walk to the nearest safe location, then sit down and begin their counter from the start.
A stunned player may not be stunned again to restart their timer.
Players can block a stun with an admin-given shield or noodle.
Admins might change the stun timer during the game or add areas players can go to respawn.
Once a dart hits the ground, any player can pick it up and use it.
Please pick up any darts you find (even if they’re not yours)
No player may take another player’s nerf blaster without permission from the owner. Any humans borrowing a loaner blaster can only give it to a moderator, NOT another player to return for them.
`,
  },
  {
    order: 3,
    sectionTitle: "Unstunning",
    sectionContent: `Any human can “unstun” any stunned human by touching them.`,
  },
  {
    order: 4,
    sectionTitle: "Secret Zombie",
    sectionContent: `Secret zombies are human in every way, except when a secret zombie touches a human:
Both players crouch/sit down are stunned for 1 minute.
The possessed human gets the victim's life code, and report the infection on the site as soon as they can.
The possessed human becomes a regular zombie and so must move the bandanna to their head.
The victim becomes the new possessed human and so keeps the bandanna on their arm.
They must count the last 10 seconds of their stun aloud.
When the minute is up, they both stand up and resume playing.`,
  },
  {
    order: 5,
    sectionTitle: "Crossing streets",
    sectionContent: `
There are many streets in the playable area for the game so please play away from traffic and use this protocol when using crosswalks:

Once you get within 15 feet of the crosswalk button, you’re out of play (can’t be infected/stunned, can’t infect/stun).
Press the button.
Once walk sign appears, everyone (humans and zombies) must walk (not run) across the crosswalk.
Once there are no players still in the crosswalk, the humans say “3 resistance, 2 resistance, 1 resistance, go!” then they are in play and can run.
Once the humans say “go!”, the zombies, still out of play, will say “3 zombie horde, 2 zombie horde, 1 zombie horde, go!” and then they are in play and can chase the humans.

No looking at cell phones in cross walks!`,
  },
  {
    order: 6,
    sectionTitle: "Time Out",
    sectionContent: `
For any reason, if a player is in an unsafe situation, that player and all players near them are out of play. The player should call “Time Out!” to tell anyone near them. No infections/stuns count.

If you hear someone yell “Time out!”, or see anyone with their first on head, put your fist on your head.
If it’s time out, and you see someone without their fist on their head, yell “Time out!”

Once there are no players in danger:

Humans say “3 resistance, 2 resistance, 1 resistance, go!” then they are in play and can run.
Once the humans say “go!”, the zombies, still out of play, will say “3 zombie horde, 2 zombie horde, 1 zombie horde, go!” and then they are in play and can chase the humans.

If this rule is not being respected, contact a moderator.`,
  },
  {
    order: 7,
    sectionTitle: "Out of Play",
    sectionContent: `
A player is playing the game (“in play”) whenever they have their armband/headband on, otherwise, they are not playing at the time (“out of play”).
A player can only put the armband/headband on, or take it off, at a door. Combined with the rule above, this means that one can only enter/leave the game at any Google door.

If you find yourself in one of these areas, you are temporarily out of play until you leave the area. Please do not abuse these areas to escape zombies:

Inside, and 10 feet around any door
Any unsafe area, such as parking lots. Going into streets will get you banned.
Any crowded area, or anywhere that will bother working people
Outdoor dining and seating when non-players are present
Shuttle stops
When riding a bike

Any player going inside or to a door during a mission BEFORE they have accomplished the objective has forfeited the mission.
No player can be infected or stunned before 9am or after 8:00pm.
Tags/Stuns made because of unsafe situations do not count.`,
  },
  {
    order: 8,
    sectionTitle: "Safe Zones",
    sectionContent: `    Any circle of cones set up by a moderator or a helper is a safe zone. Zombies cannot stun or infect players from inside safe zones. Humans can stun players from inside safe zones. Any player that has at least one foot inside the safe zone is considered to be in it.`,
  },
  {
    order: 9,
    sectionTitle: "How to Not Get Banned",
    sectionContent: `
    Don’t ever go into streets, always use crosswalks!
    Don’t bother people who are working!
    Don’t shoot a non-player!
    Do not involve non-players in the game. That means information, human shields, etc.
    Obey all Moderator and Admin instructions.
    Don’t be a jerk.
    Don't intentionally create an unsafe situation.`,
  },
];

const QUIZ_QUESTION_1 = {
  type: "boolean",
  index: 0,
  text: "Are you ready to play?",
  answers: [{
    correct: true,
    order: -1,
    text: "True",
  },
  {
    correct: false,
    order: -1,
    text: "False",
  }],
};

const QUIZ_QUESTION_2 = {
  type: "order",
  index: 1,
  text: "When a zombie is stunned, what is the correct order of events?",
  answers: [{
    correct: true,
    order: 0,
    text: "The zombie sits down (1)",
  },
  {
    correct: true,
    order: 1,
    text: "The zombie counts to 60 (2)",
  },
  {
    correct: true,
    order: 2,
    text: "The zombie counts the last 10 seconds outloud then stands and rejoins play (3)",
  },
  {
    correct: false,
    order: -1,
    text: "The human becomes a zombie (unused)",
  }],
};

const QUIZ_QUESTION_3 = {
  type: "multipleChoice",
  index: 2,
  text: "Valid races in the game are?",
  answers: [{
    correct: true,
    order: 0,
    text: "Zombie",
  },
  {
    correct: true,
    order: 1,
    text: "Human",
  },
  {
    correct: false,
    order: 2,
    text: "Sparkysparky boomboom man",
  },
  {
    correct: false,
    order: 3,
    text: "The Batman",
  }],
};

const QUIZ_QUESTION_4 = {
  type: "info",
  index: 3,
  text: "Remember to follow the rules and chat with an admin if you need anything!",
  answers: [],
};