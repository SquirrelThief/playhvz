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

// TODO: High-level file comment.

'use strict';

class FakeBridge {
  constructor(serverConfig, alertHandler) {
    this.alertHandler = alertHandler;
    firebase.initializeApp(serverConfig.firebaseConfig);
    this.db = firebase.firestore()
    // Set each firebase endpoint to use the emulator instead.
    firebase.auth().useEmulator('http://localhost:9099/');
    this.db.useEmulator("localhost", 8080);
    firebase.functions().useEmulator("localhost", 5001);

    this.devFirestoreOperations = new DevFirestoreOperations();
    this.firestoreOperations = new FirestoreOperations();
    //this.requester = new NormalRequester(serverUrl, alertHandler);
    this.server = firebase.functions();
    this.userId = null;
    this.userName = null;
    this.game = null;

    console.log("Signing in with fake auth");
    this.signOut();

    this.signedInPromise =
      new Promise((resolve, reject) => {
        firebase.auth().onAuthStateChanged((firebaseUser) => {
          if (firebaseUser) {
            console.log('Sign in successful!');
            firebaseUser.getIdToken(false).then((userIdJwt) => {
              // this.firestoreOperations.getGamesByPlayer(firebaseUser.uid);
              if (this.userId == null) {
                this.userId = firebaseUser.uid;
                //this.requester.setRequestingUserIdAndJwt(userIdJwt, this.userId);
                // Register the user in the database before we resolve the promise 
                // and say we're "signed in".
                this.register({ userId: this.userId }).then(() => {
                  resolve({ userId: this.userId, email: firebaseUser.email });
                });
              } else {
                // Sometimes we get spurious auth changes.
                // As long as we stick with the same user, its fine.
                assert(firebaseUser.uid == this.userId);
                resolve({ userId: this.userId, email: firebaseUser.email });
              }
            });
          } else {
            // This happens if the user isn't signed in.
            //console.log('onAuthStateChanged called with a null firebaseUser.');
          }
        });
      });
  }

  getSignedInUserId() {
    return firebase.auth().currentUser.uid;
  }

  setAuthChangeCallback(authChangedCallback) {
    this.authChangedCallback = authChangedCallback
  }

  async signIn({ user }) {
    if (user == this.userName) {
      return this.userId;
    }
    await this.signOut();
    await firebase.auth().signInWithCredential(firebase.auth.GoogleAuthProvider.credential(
      `{"sub": "${user}", "email": "${user}@somewebsite.lol", "email_verified": true}`
    ));
    this.userName = user
    this.userId = firebase.auth().currentUser.uid;
    return firebase.auth().currentUser.uid;
  }

  getSignedInPromise() {
    return this.signedInPromise;
  }

  async signOut() {
    this.userId = null;
    this.userName = null;
    window.localStorage.clear();
    return await firebase.auth().signOut();
  }

  register(args) {
    let { userId } = args;
    return new Promise((resolve, reject) => {
      let cachedUserId = window.localStorage.getItem('userId');
      if (userId == cachedUserId) {
        setTimeout(() => resolve(cachedUserId), 0);
      } else {
        window.localStorage.setItem('userId', userId);
        resolve(userId);
        /*this.requester
          .sendRequest('register', {
            userId: userId,
            requestingUserId: null, // Overrides what the requester wants to do
          })
          .then(
            () => {
              window.localStorage.setItem('userId', userId);
              resolve(userId);
            },
            reject);*/
      }
    });
  }

  async createGame(args) {
    var createGame = firebase.functions().httpsCallable("createGame");
    createGame(args)
      .catch(error => console.log("Warning: " + error.message + ", doing nothing."));
  }

  async getAllChatsInGame(gameId) {
    return this.devFirestoreOperations.getAllChatsInGame(gameId).then(querySnapshot => {
      let chatDocSnapshotPromises = [];
      for (let doc of querySnapshot.docs) {
        const chatId = doc.ref.id;
        const promise = this.getChatRoomOnce(gameId, chatId);
        chatDocSnapshotPromises.push(promise);
      }
      // Once we have all the chat docSnapshots, we can now render the data.
      return Promise.all(chatDocSnapshotPromises).then(snapshots => {
        let chatArray = []
        for (let chatSnapshot of snapshots) {
          if (chatSnapshot) {
            chatArray.push(chatSnapshot);
          }
        }
        return chatArray;
      });
    });
  }

  async getChatRoomOnce(gameId, chatRoomId) {
    return this.firestoreOperations.getChatRoomOnce(gameId, chatRoomId).then(docSnapshot => {
      if (docSnapshot == undefined || !docSnapshot.exists) {
        return null;
      }
      return DataConverterUtils.convertSnapshotToChatRoom(docSnapshot);
    });
  }





  changePlayerAllegiance(gameId, playerId, newAllegiance) {
    return new Promise((resolve, reject) => {
      resolve(this.server.changePlayerAllegiance(gameId, playerId, newAllegiance));
    });
  }

  sendChatMessage(gameId, messageId, chatRoomId, playerId, message) {
    return new Promise((resolve, reject) => {
      resolve(this.server.sendChatMessage(gameId, messageId, chatRoomId, playerId, message));
    });
  }

  infectPlayerByLifeCode(gameId, infectorPlayerId, victimLifeCode) {
    return new Promise((resolve, reject) => {
      resolve(this.server.infectPlayerByLifeCode(gameId, infectorPlayerId, victimLifeCode));
    })
  }

  listenToReward(gameId, rewardId, callback) {
    callback(this.server.listenToReward(gameId, rewardId));
  }

  createChatRoom(gameId, ownerId, chatName, allegianceFilter) {
    return Promise.resolve(this.server.createChatRoom(gameId, ownerId, chatName, allegianceFilter));
  }

  addPlayersToChat(gameId, groupId, chatRoomId, playerIdList) {
    return new Promise((resolve, reject) => {
      resolve(this.server.addPlayersToChat(gameId, groupId, chatRoomId, playerIdList));
    });
  }

  createMission(gameId, missionName, startTime, endTime, details, allegianceFilter) {
    return new Promise((resolve, reject) => {
      resolve(this.server.createMission(gameId, missionName, startTime, endTime, details, allegianceFilter));
    });
  }

  listenToLastMission(gameId, playerId, callback) {
    callback(this.server.listenToLastMission(gameId, playerId));
  }

  listenToMission(gameId, missionId, callback) {
    callback(this.server.listenToMission(gameId, missionId));
  }

  listenToMissionList(gameId, playerId, callback) {
    callback(this.server.listenToMissionList(gameId, playerId));
  }

  createReward(gameId, shortName, longName, description, imageUrl, points) {
    return new Promise((resolve, reject) => {
      resolve(this.server.createReward(gameId, shortName, longName, description, imageUrl, points));
    });
  }

  generateClaimCodes(gameId, rewardId, numCodes) {
    return new Promise((resolve, reject) => {
      resolve(this.server.generateClaimCodes(gameId, rewardId, numCodes));
    });
  }

  redeemRewardCode(gameId, playerId, claimCode) {
    return new Promise((resolve, reject) => {
      resolve(this.server.redeemRewardCode(gameId, playerId, claimCode));
    });
  }

  addPlayersToGroup(gameId, groupId, playerIdList) {
    return new Promise((resolve, reject) => {
      resolve(this.server.addPlayersToGroup(gameId, groupId, playerIdList));
    });
  }

  createOrGetChatWithAdmin(gameId, playerId) {
    return new Promise((resolve, reject) => {
      resolve(this.server.createOrGetChatWithAdmin(gameId, playerId));
    });
  }


}

function CloningWrapper(inner, funcNames) {
  for (const funcName of funcNames) {
    this[funcName] = function (...args) {
      // console.log('Calling', funcName, 'with args', ...args);
      return Utils.copyOf(inner[funcName](...args.map(Utils.copyOf)));
    }
  }
}

function DelayingWrapper(inner, funcNames) {
  let delay = Utils.getParameterByName('fakeServerDelay', 100);
  let synchronous = delay == 'synchronous';

  for (const funcName of funcNames) {
    this[funcName] = function (...args) {
      // console.log('Making request', funcName, ...args);
      return new Promise((resolve, reject) => {
        let execute = () => {
          try {
            //console.log('Recipient received request', funcName, ...args);
            const result = inner[funcName](...args);
            //console.log('Recipient responding with', result);
            if (synchronous)
              resolve(result);
            else
              setTimeout(() => resolve(result), delay);

          } catch (error) {
            console.log('Error doing request', funcName, ...args);
            console.error(error);

            if (synchronous)
              reject(error);
            else
              setTimeout(() => reject(error), delay);
          }
        };

        if (synchronous)
          execute();
        else
          setTimeout(execute, delay);
      });
    };
  }
}
