import { useGesture } from 'react-use-gesture'
import { useState, useRef, useEffect } from 'react'

// [-----|---------.-------]
// a     z         x       b

function Range({ sound, what, update }): JSX.Element {
	const rangeRef = useRef(document.createElement('div'))
	const init = what === 'volume' ? sound.volume : sound.release

	const [dontClick, setDontClick] = useState(false)
	const [range, setRange] = useState({
		width: 0,
		x: init * 100,
		moving: false,
	})

	// rangeRef.current.addEventListener('mouseenter', () => scrollPrevent(true))
	// rangeRef.current.addEventListener('mouseleave', () => scrollPrevent(false))

	const stayPositive = (n: number) => (n > 0 ? n : 0)

	const movingAction = state => {
		const moving = state.dragging || state.wheeling

		if (moving) {
			const percent = state.movement[0] / range.width
			setRange({ x: percent * 100, moving, width: range.width })
			update(stayPositive(percent))
			setDontClick(true)

			// Compare tens from saved value and new value
			// If different, play sound cue
			// if (+(range.x / 10).toFixed(0) !== +((percent * 100) / 10).toFixed(0)) {
			// 	actionSound()
			// }
		}
	}

	const clickAction = state => {
		if (!dontClick) {
			const childXpos = rangeRef.current.children[0].getBoundingClientRect().x
			const childWidth = state.event.clientX - childXpos
			const percent = childWidth / range.width

			setRange({ x: percent * 100, moving: false, width: range.width })
			update(stayPositive(percent))

			// Sound feedback for when you click on range
			// Animation last 200ms, and sound cue last 20ms
			// So you can only fit 10 sound cue maximum
			// let soundCueIntervalCount = 0
			// const numberOfSoundCues = +Math.abs(percent * 100 - range.x).toFixed(0) / 10
			// const soundCueInterval = setInterval(() => {
			// 	actionSound()
			// 	soundCueIntervalCount++
			// 	if (soundCueIntervalCount > numberOfSoundCues) clearInterval(soundCueInterval)
			// }, 20)
		}
	}

	const bind = useGesture(
		{
			onDrag: state => movingAction(state),
			onClick: state => clickAction(state),
			onMouseDown: () => setDontClick(false),
		},
		{
			drag: {
				axis: 'x',
				rubberband: 0,
				initial: () => [range.width * (range.x / 100), 0],
				bounds: { left: 0, right: range.width },
			},
		}
	)

	useEffect(() => {
		//
		// Only calculate bounding on start or on resize
		// Range dragging is laggy if not
		//
		const updateRangeWidth = () =>
			setRange(prev => ({
				...prev,
				width: rangeRef.current.getBoundingClientRect().width,
			}))

		updateRangeWidth()
		window.addEventListener('resize', updateRangeWidth)
	}, [])
	return (
		<div className="range-wrap" {...bind()} ref={rangeRef}>
			<div
				className={'inner-range' + (range.moving ? ' moving' : '')}
				style={{ width: range.x + '%' }}
			></div>
		</div>
	)
}

export default Range
