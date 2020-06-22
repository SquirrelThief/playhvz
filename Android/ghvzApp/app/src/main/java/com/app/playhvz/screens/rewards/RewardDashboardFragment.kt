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

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import androidx.appcompat.app.AppCompatActivity
import androidx.fragment.app.Fragment
import androidx.navigation.fragment.findNavController
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import com.app.playhvz.R
import com.app.playhvz.common.globals.SharedPreferencesConstants
import com.app.playhvz.firebase.classmodels.Game
import com.app.playhvz.firebase.classmodels.Mission
import com.app.playhvz.firebase.classmodels.Player
import com.app.playhvz.firebase.classmodels.Reward
import com.app.playhvz.firebase.viewmodels.GameViewModel
import com.app.playhvz.firebase.viewmodels.RewardListViewModel
import com.app.playhvz.navigation.NavigationUtil
import com.google.android.material.floatingactionbutton.FloatingActionButton

/** Fragment for showing a list of rewards.*/
class RewardDashboardFragment : Fragment() {
    companion object {
        private val TAG = RewardDashboardFragment::class.qualifiedName
    }

    lateinit var gameViewModel: GameViewModel
    lateinit var rewardViewModel: RewardListViewModel
    lateinit var fab: FloatingActionButton
    lateinit var recyclerView: RecyclerView
    lateinit var adapter: RewardDashboardAdapter

    var gameId: String? = null
    var playerId: String? = null
    var game: Game? = null
    var player: Player? = null

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val sharedPrefs = activity?.getSharedPreferences(
            SharedPreferencesConstants.PREFS_FILENAME,
            0
        )!!
        gameViewModel = GameViewModel()
        rewardViewModel = RewardListViewModel()
        gameId = sharedPrefs.getString(SharedPreferencesConstants.CURRENT_GAME_ID, null)
        playerId = sharedPrefs.getString(SharedPreferencesConstants.CURRENT_PLAYER_ID, null)
    }

    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View {
        val view = inflater.inflate(R.layout.fragment_reward_dashboard, container, false)
        fab = activity?.findViewById(R.id.floating_action_button)!!
        recyclerView = view.findViewById(R.id.reward_list)
        adapter = RewardDashboardAdapter(listOf(), requireContext(), findNavController())
        recyclerView.layoutManager = LinearLayoutManager(context)
        recyclerView.adapter = adapter
        setupObservers()
        setupToolbar()
        return view
    }

    fun setupToolbar() {
        val toolbar = (activity as AppCompatActivity).supportActionBar
        if (toolbar != null) {
            toolbar.title = requireContext().getString(R.string.navigation_drawer_rewards)
            toolbar.setDisplayHomeAsUpEnabled(false)
        }
    }

    private fun setupFab(isAdmin: Boolean) {
        if (!isAdmin) {
            fab.visibility = View.GONE
            return
        }
        fab.visibility = View.VISIBLE
        fab.setOnClickListener {
            createReward()
        }
        fab.visibility = View.VISIBLE
    }

    private fun setupObservers() {
        if (gameId == null || playerId == null) {
            return
        }
        gameViewModel.getGameAndAdminObserver(this, gameId!!, playerId!!) {
            NavigationUtil.navigateToGameList(
                findNavController(),
                requireActivity()
            )
        }.observe(viewLifecycleOwner, androidx.lifecycle.Observer { serverGameAndAdminStatus ->
            updateGame(serverGameAndAdminStatus)
        })
        rewardViewModel.getAllRewardsInGame(this, gameId!!)
            .observe(viewLifecycleOwner, androidx.lifecycle.Observer { serverRewardList ->
            updateRewardList(serverRewardList)
        })

    }

    private fun updateGame(serverUpdate: GameViewModel.GameWithAdminStatus?) {
        if (serverUpdate == null) {
            NavigationUtil.navigateToGameList(findNavController(), requireActivity())
        }
        game = serverUpdate!!.game
        setupFab(serverUpdate.isAdmin)
        adapter.setIsAdmin(serverUpdate.isAdmin)
        adapter.notifyDataSetChanged()

        /* if (serverUpdate.isAdmin) {
             missionViewModel.getAllMissionsInGame(this, gameId!!)
                 .observe(this, androidx.lifecycle.Observer { serverMissionList ->
                     updateMissionList(serverMissionList)
                 })
         } else {
             missionViewModel.getMissionListOfMissionsPlayerIsIn(this, gameId!!, playerId!!)
                 .observe(this, androidx.lifecycle.Observer { serverMissionList ->
                     updateMissionList(serverMissionList)
                 })
         } */
    }

    private fun updateRewardList(updatedRewardList: List<Reward>) {
        adapter.setData(updatedRewardList)
        adapter.notifyDataSetChanged()
    }

    private fun createReward() {
        NavigationUtil.navigateToRewardSettings(findNavController(), null)
    }
}