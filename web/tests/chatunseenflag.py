#!/usr/bin/python
#
# Copyright 2017 Google Inc.
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#      http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

""" Tests for the chat unseen message badge. """

import sys
import pdb


def main(argv):
    pass


if __name__ == '__main__':
    main(sys.argv)
import setup
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys

# Test Setup
playerNames = {
        'zella': 'ZellaTheUltimate',
        'deckerd': 'DeckerdTheHesitant',
        'moldavi': 'MoldaviTheMoldavish',
        'drake': 'Drackan',
        'zeke': 'Zeke',
        'jack': 'JackSlayerTheBeanSlasher'
      }

# Start Test
actingPlayer = 'zella' # admin human
actingPlayerName = playerNames[actingPlayer]
driver = setup.MakeDriver()
driver.WaitForGameLoaded()

# Empty chat shouldn't have an unseen badge
driver.DontFindElement([[By.ID, 'drawerChatItem-Global Chat'], [By.NAME, 'unseenIcon']])

# Chats with messages should have an unseen badge
driver.FindElement([[By.ID, 'drawerChatItem-Resistance Comms Hub'], [By.NAME, 'unseenIcon']])
driver.FindElement([[By.ID, 'drawerChatItem-My Chat Room!'], [By.NAME, 'unseenIcon']])
      
driver.Quit()