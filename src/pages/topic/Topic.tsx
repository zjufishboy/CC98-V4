import React from 'react'
import { RouteComponentProps } from 'react-router'
import { IBoard, IPost, ITopic } from '@cc98/api'
import axios, { CancelTokenSource } from 'axios'
import { push } from 'connected-react-router'
import { useDispatch } from 'react-redux'
import produce from 'immer'
import Spin from 'src/components/Spin'
import {
  getTopicInfo,
  getTopicPostList,
  getTopicTopPostList,
  getTopicTrackPostList,
} from 'src/service/topic'
import { getBoardInfo } from 'src/service/board'
import useBreadcrumb from 'src/hooks/useBreadcrumb'
import Pagination from 'src/components/Pagination'
import { getUsersByNames } from 'src/service/user'
import { getPostLikeState } from 'src/service/post'
import IUserMap from 'src/types/IUserMap'

import TopicHeader from 'src/pages/topic/components/TopicHeader'
import PostItem from 'src/pages/topic/components/PostItem'

import s from './Topic.m.scss'

interface ITopicRouteMatch {
  topicId: string
  page?: string
  // 有 postId 说明是追踪模式
  postId?: string
}

const PAGE_SIZE = 10

const baseBreadcrumb = [
  {
    name: '首页',
    url: '/',
  },
  {
    name: '版面列表',
    url: '/board-list',
  },
]

const Topic: React.FC<RouteComponentProps<ITopicRouteMatch>> = ({ match, location }) => {
  const [topicInfo, setTopicInfo] = React.useState<ITopic>()
  const [boardInfo, setBoardInfo] = React.useState<IBoard>()
  const [posts, setPosts] = React.useState<IPost[]>([])
  const [hotPosts, setHotPosts] = React.useState<IPost[]>([])
  const [userMap, setUserMap] = React.useState<IUserMap>({})
  const [isTopicLoading, setIsTopicLoading] = React.useState(false)
  const source = React.useRef(axios.CancelToken.source())
  const dispatch = useDispatch()

  const focusFloor = parseInt(location.hash.slice(1), 10)
  const { topicId, postId } = match.params
  const isTracking = !!postId
  const currentPage = parseInt(match.params.page || '1', 10)
  const totalPage = getTotalPage(isTracking, currentPage, topicInfo, posts[0])

  // 获取 topic & board 信息
  React.useEffect(() => {
    getTopicInfo(topicId)
      .then(topic => {
        setTopicInfo(topic)
        return getBoardInfo(topic.boardId)
      })
      .then(setBoardInfo)
  }, [topicId])

  // 获取内容
  React.useEffect(() => {
    setIsTopicLoading(true)
    setPosts([])
    setHotPosts([])
    source.current.cancel()
    source.current = axios.CancelToken.source()
    Promise.all(
      getPosts(topicId, currentPage, isTracking, setPosts, setHotPosts, source.current, postId)
    )

      .then(([postData, hotPostData = []]) => {
        setIsTopicLoading(false)
        if (
          (!postData.length || postData[0].isAnonymous) &&
          (!hotPostData.length || hotPostData[0].isAnonymous)
        ) {
          return []
        }

        const allData = [...postData, ...hotPostData]

        const userNames = [
          ...allData.map(item => item.userName),
          ...allData.reduce(
            (res, curr) => [...res, ...curr.awards.map(item => item.operatorName)],
            [] as string[]
          ),
        ]

        return getUsersByNames(userNames)
      })
      .then(users =>
        setUserMap(
          users.reduce(
            (res, user) => {
              res[user.name] = user
              return res
            },
            {} as IUserMap
          )
        )
      )
  }, [topicId, isTracking, postId, currentPage])

  useBreadcrumb([
    ...baseBreadcrumb,
    boardInfo ? { url: `/board/${boardInfo.id}`, name: boardInfo.name } : ' ',
    topicInfo ? topicInfo.title : '',
  ])

  const handlePage = (page: number) => {
    dispatch(
      push(
        isTracking ? `/topic/${topicId}/postid/${postId}/${page}#1` : `/topic/${topicId}/${page}#1`
      )
    )
  }

  const refreshPostLikeState = (id: number) => {
    getPostLikeState(id).then(likeState => {
      setHotPosts(
        produce(hotPosts, draft => {
          draft
            .filter(item => item.id === id)
            .forEach(item => {
              item.likeState = likeState.likeState
              item.likeCount = likeState.likeCount
              item.dislikeCount = likeState.dislikeCount
            })
        })
      )
      setPosts(
        produce(posts, draft => {
          draft
            .filter(item => item.id === id)
            .forEach(item => {
              item.likeState = likeState.likeState
              item.likeCount = likeState.likeCount
              item.dislikeCount = likeState.dislikeCount
            })
        })
      )
    })
  }

  return (
    <div className={s.root}>
      <Pagination total={totalPage} onChange={handlePage} current={currentPage} />
      {topicInfo && <TopicHeader topicInfo={topicInfo} boardInfo={boardInfo} />}
      {isTopicLoading && <Spin />}
      {posts.slice(0, 1).map(item => (
        <PostItem
          post={item}
          isTracking={isTracking}
          topicInfo={topicInfo}
          user={userMap[item.userName]}
          boardInfo={boardInfo}
          refreshPostLikeState={() => refreshPostLikeState(item.id)}
          key={item.id}
          focus={focusFloor === 1}
          userMap={userMap}
        />
      ))}
      {hotPosts.map(item => (
        <PostItem
          post={item}
          isTracking={isTracking}
          user={userMap[item.userName]}
          boardInfo={boardInfo}
          topicInfo={topicInfo}
          refreshPostLikeState={() => refreshPostLikeState(item.id)}
          key={item.id}
          userMap={userMap}
          isHot
        />
      ))}
      {posts.slice(1).map((item, index) => (
        <PostItem
          post={item}
          isTracking={isTracking}
          topicInfo={topicInfo}
          user={userMap[item.userName]}
          boardInfo={boardInfo}
          refreshPostLikeState={() => refreshPostLikeState(item.id)}
          key={item.id}
          focus={focusFloor === index + 2}
          userMap={userMap}
        />
      ))}
      <Pagination total={totalPage} onChange={handlePage} current={currentPage} />
    </div>
  )
}

export default Topic

function getTotalPage(isTracking: boolean, currentPage: number, topicInfo?: ITopic, post?: IPost) {
  switch (true) {
    case isTracking && !!post && !!post.count:
      return Math.ceil(post!.count! / PAGE_SIZE)
    case !isTracking && !!topicInfo:
      return Math.ceil((topicInfo!.replyCount + 1) / PAGE_SIZE)
    default:
      return currentPage
  }
}

// 之所以写的这么丑
// 是为了并行获取普通帖子内容和热帖后
// 同时获取用户信息
function getPosts(
  topicId: string,
  currentPage: number,
  isTracking: boolean,
  setPosts: (posts: IPost[]) => void,
  setHotPosts: (posts: IPost[]) => void,
  source: CancelTokenSource,
  postId?: string
): [Promise<IPost[]>, Promise<IPost[]> | undefined] {
  const from = (currentPage - 1) * PAGE_SIZE

  if (isTracking) {
    return [
      getTopicTrackPostList(topicId, postId!, from, PAGE_SIZE, source.token).then(data => {
        setPosts(data)
        setHotPosts([])
        return data
      }),
      undefined,
    ]
  }

  if (currentPage === 1) {
    return [
      getTopicPostList(topicId, from, PAGE_SIZE, source.token).then(data => {
        setPosts(data)
        return data
      }),
      getTopicTopPostList(topicId, source.token).then(data => {
        setHotPosts(data)
        return data
      }),
    ]
  }

  return [
    getTopicPostList(topicId, from, PAGE_SIZE, source.token).then(data => {
      setPosts(data)
      setHotPosts([])
      return data
    }),
    undefined,
  ]
}