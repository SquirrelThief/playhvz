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

package com.app.playhvz.screens.rewards

import android.view.View
import android.widget.ImageView
import android.widget.LinearLayout
import android.widget.TextView
import androidx.constraintlayout.widget.ConstraintLayout
import androidx.emoji.widget.EmojiTextView
import androidx.navigation.NavController
import androidx.recyclerview.widget.RecyclerView
import com.app.playhvz.R
import com.app.playhvz.firebase.classmodels.Reward
import com.app.playhvz.navigation.NavigationUtil
import com.app.playhvz.utils.ImageDownloaderUtils
import com.google.android.material.button.MaterialButton
import com.google.android.material.card.MaterialCardView

class RewardViewHolder(view: View, private val navController: NavController) :
    RecyclerView.ViewHolder(view) {

    private var rewardCard: MaterialCardView = view.findViewById(R.id.reward_card)
    private var cardTitle: EmojiTextView = rewardCard.findViewById(R.id.title)
    private var cardHeader: LinearLayout = rewardCard.findViewById(R.id.card_header)
    private var cardHeaderIcon: MaterialButton = rewardCard.findViewById(R.id.card_header_icon)
    private var cardContent: ConstraintLayout = rewardCard.findViewById(R.id.card_content)
    private var imageView: ImageView = rewardCard.findViewById(R.id.reward_badge_image)
    private var pointView: TextView = rewardCard.findViewById(R.id.reward_points)
    private var longNameView: EmojiTextView = rewardCard.findViewById(R.id.reward_long_name)
    private var descriptionView: EmojiTextView = rewardCard.findViewById(R.id.reward_description)

    init {
        cardHeader.setOnClickListener {
            if (cardContent.visibility == View.VISIBLE) {
                // Collapse the card content
                cardContent.visibility = View.GONE
            } else {
                // Display the card content
                cardContent.visibility = View.VISIBLE
            }
        }
    }

    fun onBind(reward: Reward, isAdmin: Boolean) {
        if (isAdmin) {
            cardHeaderIcon.visibility = View.VISIBLE
            cardHeaderIcon.setOnClickListener {
                NavigationUtil.navigateToRewardSettings(navController, reward.id)
            }
        } else {
            cardHeaderIcon.visibility = View.GONE
        }

        cardTitle.text = reward.shortName
        longNameView.text = reward.longName
        descriptionView.text = reward.description
        if (reward.imageUrl.isNullOrBlank()) {
            imageView.visibility = View.GONE
        } else {
            ImageDownloaderUtils.downloadSquareImage(imageView, reward.imageUrl!!)
        }
        var points = 0
        if (reward.points != null) {
            points = reward.points!!
        }
        pointView.text =
            pointView.resources.getQuantityString(
                R.plurals.reward_card_label_points,
                points,
                points
            )
    }
}