import React from 'react'
import { RouteComponentProps } from 'react-router'
import List from 'src/components/List'
import { getMyFollower, getUsersByIds } from 'src/service/user'
import UserItem from 'src/pages/user-center/components/UserCenterListItem/UserItem'
import { IUser } from '@cc98/api'
import { USER_CENTER_BASE_PATH } from 'src/pages/user-center/constants'

interface IUserFanRouteMatch {
  page?: string
}

const PAGE_SIZE = 10

// (...args) => Promise<IUser[]>
const service = (page: number, pageSize: number) =>
  getMyFollower((page - 1) * PAGE_SIZE, pageSize).then(ids => {
    return getUsersByIds(ids, true).then(users => {
      // api 返回的用户信息是乱序的
      return ids // 换行
        .map(id => users.find(user => user.id === id))
        .filter(user => !!user) as IUser[]
    })
  })

const UserFan: React.FC<RouteComponentProps<IUserFanRouteMatch>> = ({ match, history }) => {
  const { page = '1' } = match.params

  return (
    <List
      emptyText="没有粉丝"
      currentPage={parseInt(page, 10)}
      pageSize={PAGE_SIZE}
      onPageChange={nextPage => {
        history.push(`${USER_CENTER_BASE_PATH}/fan/${nextPage}`)
      }}
      service={service}
      renderItem={user => <UserItem user={user} />}
    />
  )
}

export default UserFan
