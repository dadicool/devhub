import _ from 'lodash'
import React, { PureComponent } from 'react'

import {
  ActivitySubscription,
  Column,
  ColumnSubscription,
  EnhancedGitHubEvent,
  GitHubEvent,
  Omit,
} from 'shared-core/dist/types'
import { getFilteredEvents } from 'shared-core/dist/utils/helpers/shared'
import { EventCards, EventCardsProps } from '../components/cards/EventCards'
import { getActivity } from '../libs/github'

export type EventCardsContainerProps = Omit<
  EventCardsProps,
  'events' | 'fetchNextPage'
> & {
  column: Column
  subscriptions: ColumnSubscription[]
}

export interface EventCardsContainerState {
  canFetchMore: boolean
  enhancedEvents: EnhancedGitHubEvent[]
  events: GitHubEvent[]
  page: number
  perPage: number
}

export class EventCardsContainer extends PureComponent<
  EventCardsContainerProps,
  EventCardsContainerState
> {
  fetchDataInterval?: number

  state: EventCardsContainerState = {
    canFetchMore: false,
    enhancedEvents: [],
    events: [],
    page: 1,
    perPage: 20,
  }

  componentDidMount() {
    this.startFetchDataInterval()
  }

  componentDidUpdate(
    prevProps: EventCardsContainerProps,
    prevState: EventCardsContainerState,
  ) {
    if (
      this.props.column !== prevProps.column ||
      this.state.events !== prevState.events
    ) {
      this.setState(state => ({
        enhancedEvents: getFilteredEvents(
          state.events,
          this.props.column.filters,
        ),
      }))
    }
  }

  componentWillUnmount() {
    this.clearFetchDataInterval()
  }

  fetchData = async ({
    page = 1,
    perPage = 20,
  }: { page?: number; perPage?: number } = {}) => {
    const { subscriptions } = this.props
    const {
      id: subscriptionId,
      params: _params,
      subtype: activityType,
    } = subscriptions[0] as ActivitySubscription
    try {
      const params = { ..._params, page, per_page: perPage }
      const response = await getActivity(activityType, params, {
        subscriptionId,
      })

      if (Array.isArray(response.data) && response.data.length) {
        const events = _.concat(response.data, this.state.events)
        this.setState({
          canFetchMore: response.data.length >= perPage,
          events,
          page,
        })
      } else {
        this.setState({ canFetchMore: false, page })
      }
    } catch (error) {
      console.error('Failed to load GitHub activity', error)
    }
  }

  startFetchDataInterval = () => {
    this.clearFetchDataInterval()
    this.fetchDataInterval = setInterval(this.fetchData, 1000 * 60) as any
    this.fetchData()
  }

  clearFetchDataInterval = () => {
    if (this.fetchDataInterval) {
      clearInterval(this.fetchDataInterval)
      this.fetchDataInterval = undefined
    }
  }

  fetchNextPage = ({ perPage }: { perPage?: number } = {}) => {
    const nextPage = (this.state.page || 1) + 1
    this.fetchData({ page: nextPage, perPage })
  }

  render() {
    const { canFetchMore, enhancedEvents } = this.state

    return (
      <EventCards
        {...this.props}
        events={enhancedEvents}
        fetchNextPage={canFetchMore ? this.fetchNextPage : undefined}
      />
    )
  }
}