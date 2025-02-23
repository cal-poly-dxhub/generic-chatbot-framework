from francis_toolkit.types import HandoffState


def handoff_transition(num_requests: int, handoff_threshold: int, handoff_state: HandoffState) -> HandoffState:
    """
    Provides the next handoff state based on the number of requests and the handoff threshold.
    """

    # NOTE: a state transition to HANDOFF_UP is done externally to this method,
    # via an API call behind the handoff button

    new_handoff_state = handoff_state

    if num_requests < handoff_threshold:
        new_handoff_state = HandoffState.NO_HANDOFF
    else:
        match handoff_state:
            case HandoffState.NO_HANDOFF:
                new_handoff_state = HandoffState.HANDOFF_UP
            case HandoffState.JUST_TRIGGERED:
                new_handoff_state = HandoffState.HANDOFF_COMPLETING
            case HandoffState.HANDOFF_COMPLETING:
                new_handoff_state = HandoffState.HANDOFF_COMPLETING
            case HandoffState.HANDOFF_UP:
                new_handoff_state = HandoffState.HANDOFF_UP

    return new_handoff_state
