import { useGesture } from 'react-use-gesture'
import { useState, useRef, useEffect } from 'react'
import { disableBodyScroll, enableBodyScroll } from 'body-scroll-lock'

import propTypes from 'prop-types'

// Wheels work by getting the index of an element with wheel height divided by children height
// Up movement uses translateY(-px), incrementing is negative, so maths are weird

const freqArr = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']

const fillArray = (start: number, end: number, freq?: boolean) => {
	const arr: any[] = []
	for (let i = start; i <= end; i++) arr.push(freq ? freqArr[i % freqArr.length] : i)
	return arr
}

// Init all wheels text before JSX Element
const allLists = {
	beats: fillArray(2, 16),
	tempo: fillArray(30, 300),
	frequency: fillArray(0, freqArr.length * 3, true),
}

function Wheel({ update, tempo, freq, beats }): JSX.Element {
	const what: {
		height: number
		list: (number | string)[]
		current: number
		offset: number
	} = { height: 50, list: [], current: 0, offset: 0 }

	if (tempo !== undefined) {
		what.height = 80
		what.list = allLists.tempo
		what.current = tempo
		what.offset = 30
	}

	if (beats !== undefined) {
		what.list = allLists.beats
		what.current = beats
		what.offset = 2
	}

	if (freq !== undefined) {
		what.list = allLists.frequency
		what.current = freq
	}

	const height = what.height
	const list = what.list
	const maxMovement = -height * list.length + height
	const current = what.current
	const initOffset = what.offset

	// States
	const wheelRef = useRef(document.createElement('div'))
	const [saved, setSaved] = useState(current)
	const [wheel, setWheel] = useState({
		y: (current - initOffset) * -height,
		snap: true,
	})

	// Let go and wheel align with the nearest element
	const wheelSnapping = (y: number) => {
		let toTranslate = y
		const surplus = y % height
		const isAboveHalfHeight = -surplus >= height / 2

		// Snap to Element
		toTranslate -= isAboveHalfHeight ? height + surplus : surplus

		// Lower - Upper bounds
		if (toTranslate > 0) toTranslate = 0
		if (toTranslate < maxMovement) toTranslate = maxMovement

		setWheel({ y: toTranslate, snap: true })

		return toTranslate
	}

	const movingAction = (state: any) => {
		const y = state.movement[1]
		const userMoves = state.dragging || state.wheeling || state.scrolling

		if (userMoves) {
			setWheel({ y, snap: false })
		} else {
			// Save element position
			let number = +(Math.abs(wheelSnapping(y)) / height)

			setSaved(number)
			update(number)
		}

		return false
	}

	const bind = useGesture(
		{
			onDrag: state => movingAction(state),
			onWheel: state => movingAction(state),
		},
		{
			drag: {
				axis: 'y',
				rubberband: 0.1,
				initial: () => [0, wheel.y],
				bounds: { bottom: 0, top: maxMovement },
			},
			wheel: {
				axis: 'y',
				rubberband: 0.1,
				initial: () => [0, wheel.y],
				bounds: { bottom: 0, top: maxMovement },
			},
		}
	)

	// Listens for state changes outside of the component
	// Only update affected wheel
	useEffect(() => {
		if (current !== saved) {
			// Update Wheel when randomize beats
			if (beats !== undefined) setWheel({ y: (current - 2) * -height, snap: true })

			// Update Wheel when tempo tapping
			if (tempo !== undefined) setWheel({ y: (current - 30) * -height, snap: false })

			setSaved(current)
		}
		// eslint-disable-next-line
	}, [current])

	useEffect(() => {
		wheelRef.current.addEventListener('mouseenter', () => disableBodyScroll(document.body))
		wheelRef.current.addEventListener('mouseleave', () => enableBodyScroll(document.body))
	}, [])

	return (
		<div className="immovable_wheel">
			<div
				{...bind()}
				ref={wheelRef}
				className={'wheel' + (wheel.snap ? '' : ' dragging')}
				style={{ transform: `translateY(${wheel.y}px)` }}
			>
				{list.map((elem, i: number) => (
					<div key={'wheel_child' + i}>{elem}</div>
				))}
			</div>
		</div>
	)
}

Wheel.propTypes = {
	update: propTypes.func.isRequired,
	tempo: propTypes.number,
	beats: propTypes.number,
	freq: propTypes.number,
}

export default Wheel
