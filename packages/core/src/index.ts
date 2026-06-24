export type MonitorState = {
  lastStatus: 'pending' | 'up' | 'down';
  consecutiveFailures: number;
  failureThreshold: number;
};

export type StateTransition = {
  status: 'up' | 'down';
  consecutiveFailures: number;
  event: 'none' | 'opened' | 'resolved';
};

export function applyCheck(state: MonitorState, success: boolean): StateTransition {
  if (success) {
    return {
      status: 'up',
      consecutiveFailures: 0,
      event: state.lastStatus === 'down' ? 'resolved' : 'none'
    };
  }

  const failures = state.consecutiveFailures + 1;
  const isDown = failures >= state.failureThreshold;
  return {
    status: isDown ? 'down' : state.lastStatus === 'pending' ? 'up' : state.lastStatus,
    consecutiveFailures: failures,
    event: isDown && state.lastStatus !== 'down' ? 'opened' : 'none'
  };
}
