import { useSocketEvent } from "./use-socket-event"
import { SocketEvents } from "@/types/socket"
import { useLoginAlertStore } from "@/store/auth/login-alert-store"
import { useLogout } from "../auth/use-logout"
import { Session } from "@/types/sessions"

export const useAuthSocket = () => {
  const { addAlert } = useLoginAlertStore()
  const { mutation: logoutMutation } = useLogout()

  useSocketEvent(SocketEvents.PRESENCE_INACTIVATED_SESSIONS, () => {
    logoutMutation.mutate()
  })

  useSocketEvent<{ session: Session }>(
    SocketEvents.AUTH_NEW_LOGIN,
    (result) => {
      addAlert(result?.session)
    }
  )
}
