import which from 'which'

export default {
  which(command: string) {
    try {
      which.sync(command)
      return true
    } catch (e) {
      return false
    }
  }
}
