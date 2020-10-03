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

class RemoteBridge {
  constructor(serverUrl, firebaseConfig, alertHandler, getGame) {
    this.alertHandler = alertHandler;

    firebase.initializeApp(firebaseConfig);
    this.firebaseRoot = null;
    //this.firebaseListener = new FirebaseListener(this.firebaseRoot);
    this.firestoreOperations = new FirestoreOperations();

    this.requester = new NormalRequester(serverUrl, alertHandler);

    this.userId = null;
    this.game = null;

    for (let methodName of Bridge.METHODS) {
      if (!this[methodName]) {
        this[methodName] = function (args) {
          return this.requester.sendRequest(methodName, args);
        };
      }
    }

    let signInMethod = Utils.getParameterByName('signInMethod', 'google');
    assert(signInMethod == 'google' || signInMethod == 'email' || signInMethod == 'accessToken', 'signInMethod must be "google" or "email" or "accessToken"!');
    if (signInMethod == 'email') {
      console.log("Since signInMethod is 'email', logging out first...");
      this.signOut();
      let email = Utils.getParameterByName('email', null);
      let password = Utils.getParameterByName('password', null);
      if (!email || !password) {
        this.alertHandler('Email and password must be set');
        return;
      }
      console.log('Signing in with email and password...');
      firebase.auth().signInWithEmailAndPassword(email, password);
    } else if (signInMethod == 'accessToken') {
      console.log("Since signInMethod is 'accessToken', logging out first...");
      this.signOut();
      let accessToken = Utils.getParameterByName('accessToken', null);
      if (!accessToken) {
        this.alertHandler('If signInMethod=accessToken, then accessToken must be set!');
        return;
      }
      console.log('Signing in with credential...');

      let provider = new firebase.auth.GoogleAuthProvider();
      provider.addScope('email');
      let credential = provider.credential(accessToken, null);
      firebase.auth().signInWithCredential(credential);
    }

    this.signedInPromise =
      new Promise((resolve, reject) => {
        firebase.auth().onAuthStateChanged((firebaseUser) => {
          if (firebaseUser) {
            console.log('Sign in successful!');
            firebaseUser.getIdToken(false).then((userIdJwt) => {
              // this.firestoreOperations.getGamesByPlayer(firebaseUser.uid);
              if (this.userId == null) {
                this.userId = firebaseUser.uid;
                this.requester.setRequestingUserIdAndJwt(userIdJwt, this.userId);
                // Register the user in the database before we resolve the promise 
                // and say we're "signed in".
                this.register({ userId: this.userId }).then(() => {
                  resolve({ userId: this.userId, email: firebaseUser.email });
                });
              } else {
                // Sometimes we get spurious auth changes.
                // As long as we stick with the same user, its fine.
                assert(firebaseUser.uid == this.userId);
              }
            });
          } else {
            // This happens if the user isn't signed in.
            console.log('onAuthStateChanged called with a null firebaseUser.');
          }
        });
      });
  }

  signIn({ }) {
    if (this.userId == null) {
      return new Promise((resolve, reject) => {
        console.log('Signing in with redirect...');
        let provider = new firebase.auth.GoogleAuthProvider();
        provider.addScope('email');
        firebase.auth().signInWithRedirect(provider);
      });
    } else {
      throwError("Called signIn when already signed in!");
    }
  }

  getSignedInPromise() {
    return this.signedInPromise;
  }

  signOut() {
    window.localStorage.clear();
    return firebase.auth().signOut();
  }

  ///////////////////////////////////////////////////////////////
  // Start of new Firestore support functions.
  ///////////////////////////////////////////////////////////////
  getGameList(userId) {
    // Get all the game ids for which this user has a player, then
    // get all of those games.
    return this.firestoreOperations.getGamesByPlayer(userId).then(querySnapshot => {
      let gameDocSnapshotPromises = [];
      for (let doc of querySnapshot.docs) {
        const gameId = doc.ref.parent.parent.id
        const promise = this.getGame(gameId)
        gameDocSnapshotPromises.push(promise);
      }
      // Once we have all the game docs, we can now render the data.
      return Promise.all(gameDocSnapshotPromises).then(valueSnapshots => {
        let gameArray = []
        for (let docSnapshot of valueSnapshots) {
          if (docSnapshot) {
            //gameArray.push(DataConverterUtils.convertSnapshotToGame(docSnapshot));
            gameArray.push(docSnapshot);
          }
        }
        return gameArray;
      });
    });
  }

  getGame(gameId) {
    return this.firestoreOperations.getGame(gameId).then(docSnapshot => {
      if (!docSnapshot.exists) {
        return null
      }
      return DataConverterUtils.convertSnapshotToGame(docSnapshot);
    });
  }


  getPlayer(userId, gameId) {
    return this.firestoreOperations.getUserPlayer(userId, gameId).then(querySnapshot => {
      if (querySnapshot.docs.length > 1) {
        return null
      }
      return DataConverterUtils.convertSnapshotToPlayer(querySnapshot.docs[0]);
    });
  }

  listenToPlayer(gameId, playerId) {
    return this.firestoreOperations.getPlayer(gameId, playerId).then(docSnapshot => {
      if (!docSnapshot.exists) {
        return null
      }
      return DataConverterUtils.convertSnapshotToPlayer(docSnapshot);
    });
  }

  listenToGroup(gameId, groupId) {
    return this.firestoreOperations.getGroup(gameId, groupId).then(docSnapshot => {
      if (!docSnapshot.exists) {
        return null
      }
      return DataConverterUtils.convertSnapshotToGroup(docSnapshot);
    });
  }

  listenToChatRoom(gameId, chatRoomId) {
    return this.firestoreOperations.getChatRoom(gameId, chatRoomId).then(docSnapshot => {
      if (!docSnapshot.exists) {
        return null
      }
      return DataConverterUtils.convertSnapshotToChatRoom(docSnapshot);
    });
  }

  listenToChatRoomMessages(gameId, chatRoomId) {
    return this.firestoreOperations.getChatRoomMessages(gameId, chatRoomId).then(querySnapshot => {
      let messageArray = [];
      for (let doc of querySnapshot.docs) {
        let message = DataConverterUtils.convertSnapshotToMessage(doc);
        messageArray.push(message);
      }
      return messageArray;
    });
  }

  ///////////////////////////////////////////////////////////////
  // End of new Firestore support functions.
  ///////////////////////////////////////////////////////////////

  // Deprecated
  listenToGame(userId, gameId, destination) {
    return null /*this.firebaseListener.listenToGame(
      userId,
      gameId,
      new ObservableWriter(
        destination,
        (operation) => {
          if (operation.type == 'set' && operation.path.length == 0) {
            // The game object has come, store it for later use
            this.game = operation.value;
          }
        })); */
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

  setPlayerId(playerId) {
    this.requester.setRequestingPlayerId(playerId);
  }

  waitUntilExists(ref) {
    return new Promise((resolve, reject) => {
      function listener() {
        ref.off('value', listener);
        resolve();
      };
      ref.on('value', listener);
    });
  }

  sendChatMessage(args) {
    let { gameId, messageId, chatRoomId, playerId, message, location, image } = args;
    assert(playerId);
    assert(messageId);
    let chatRoomRef = this.firebaseRoot.child(`/chatRooms/${chatRoomId}`);
    return this.waitUntilExists(chatRoomRef)
      .then(() => {
        let firebaseMessage = {
          playerId: playerId,
          time: firebase.database.ServerValue.TIMESTAMP,
        };
        if (message)
          firebaseMessage.message = message;
        if (location)
          firebaseMessage.location = location;
        if (image)
          firebaseMessage.image = image;

        return chatRoomRef.child('messages').child(messageId).set(firebaseMessage);
      });
  }

  updateChatRoomMembership(args) {
    console.log('Updating chat room membership!', args);
    let { chatRoomId, actingPlayerId, lastHiddenTime, lastSeenTime } = args;
    let actingPrivatePlayerId = this.game.playersById[actingPlayerId].privatePlayerId;
    assert(chatRoomId, actingPlayerId);
    let membershipRef = this.firebaseRoot.child(`/privatePlayers/${actingPrivatePlayerId}/chatRoomMemberships/${chatRoomId}`);
    return this.waitUntilExists(membershipRef)
      .then(() => {
        let promises = [];
        if (lastHiddenTime !== undefined)
          promises.push(membershipRef.child('lastHiddenTime').set(lastHiddenTime));
        if (lastSeenTime !== undefined)
          promises.push(membershipRef.child('lastSeenTime').set(lastSeenTime));
        return Promise.all(promises);
      });
  }
}
