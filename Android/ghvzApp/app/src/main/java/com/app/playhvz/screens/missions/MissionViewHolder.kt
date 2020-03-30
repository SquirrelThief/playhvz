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

package com.app.playhvz.screens.missions

import android.view.View
import android.widget.TextView
import androidx.emoji.widget.EmojiTextView
import androidx.recyclerview.widget.RecyclerView
import com.app.playhvz.R
import com.app.playhvz.firebase.classmodels.Mission
import com.app.playhvz.utils.TimeUtils
import com.google.android.material.card.MaterialCardView

class MissionViewHolder(view: View) : RecyclerView.ViewHolder(view) {

    private var missionCard: MaterialCardView = view.findViewById(R.id.mission_card)
    private var cardTitle: EmojiTextView = missionCard.findViewById(R.id.title)
    private var startTimeView: TextView = missionCard.findViewById(R.id.mission_start_time)
    private var endTimeView: TextView = missionCard.findViewById(R.id.mission_end_time)
    private var detailsView: EmojiTextView = missionCard.findViewById(R.id.mission_details)

    fun onBind(mission: Mission) {
        cardTitle.text = mission.name
        startTimeView.text = TimeUtils.getFormattedTime(mission.startTime, true)
        endTimeView.text = TimeUtils.getFormattedTime(mission.endTime, true)
        detailsView.text = mission.details
    }
}