/*
 * Copyright 2020 Google Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/*************************************************************
 * Current structure of a Player document:
 *
 * Player
 *    UserId - [private] user associated with this player
 *    Name - [public] nickname
 *    AvatarUrl - [public] image url
 *    Allegiance - [public] player's allegiance/team
 *
 ************************************************************/

import * as Universal from './universal';
import * as Defaults from './defaults';
import * as GeneralUtils from '../utils/generalutils';

export const COLLECTION_PATH = "players";
export const FIELD__USER_ID = Universal.FIELD__USER_ID;
export const FIELD__NAME = "name";
export const FIELD__AVATAR_URL = "avatarUrl";
export const FIELD__ALLEGIANCE = "allegiance";
export const FIELD__POINTS = "points";
export const FIELD__CHAT_MEMBERSHIPS = "chatRoomMemberships";
export const FIELD__CHAT_VISIBILITY = "isVisible";
export const FIELD__CHAT_NOTIFICATIONS = "allowNotifications";
export const FIELD__LIVES = "lives";
export const FIELD__LIFE_CODE = "lifeCode";
export const FIELD__LIFE_CODE_STATUS = "isActive";
export const FIELD__LIFE_CODE_TIMESTAMP = "created";
export const FIELD__REWARDS = "rewards";

export function create(userId: string, name: string): { [key: string]: any; } {
	return {
		[FIELD__USER_ID]: userId,
		[FIELD__NAME]: name,
		[FIELD__AVATAR_URL]: getDefaultProfilePic(name),
		[FIELD__POINTS]: 0,
		[FIELD__ALLEGIANCE]: Defaults.allegiance,
		[FIELD__CHAT_MEMBERSHIPS]: {},
		[FIELD__LIVES]: {}
	};
}

function getDefaultProfilePic(name: string) {
	if (!name) {
		return '';
	}

	const defaultProfilePics = [
		'https://bit.ly/3ct8ewW',
		'https://bit.ly/2P5f5UN',
		'https://bit.ly/3lYOFA3',
		'https://bit.ly/2QLFDuA',
		'https://bit.ly/3fmceRJ',
		'https://bit.ly/39nXdvb',
		'https://bit.ly/2PD9JzD',
		'https://bit.ly/2PynTlV',
		'https://bit.ly/3lXs4n8',
		'https://bit.ly/3u04XLz',
		'https://bit.ly/3lZKbcs',
		'https://bit.ly/3degYpT',
		'https://bit.ly/39kL4XY',
		'https://bit.ly/39gTXBJ',
		'https://bit.ly/3rCzjCx',
		'https://bit.ly/3svDT6K',
		'https://bit.ly/3w71pcb',
		'https://bit.ly/3swdVjl',
		'https://bit.ly/3lVsZon',
		'https://bit.ly/3sH4SfP',
		'https://bit.ly/3sy9qov',
		'https://bit.ly/2QLy0Ev',
		'https://bit.ly/3cqG4mu',
		'https://bit.ly/2P5gHOl',
		'https://bit.ly/3swiha6',
		'https://bit.ly/3fhjvT3',
		'https://bit.ly/3w8iQJo',
		'https://bit.ly/2QGqNp3',
	];

	const hash = Math.abs(GeneralUtils.hashString(name));
	const index = GeneralUtils.mod(hash, defaultProfilePics.length);
	return defaultProfilePics[index];
};
