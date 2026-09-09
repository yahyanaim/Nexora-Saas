import { Spinner } from "./spinner"

const LoadingPage = () => {
  return (
    <div className="grid h-screen place-content-center bg-primary">
      <Spinner color="#fff" className="h-10 w-10 text-primary" />
    </div>
  )
}

export default LoadingPage
