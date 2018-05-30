'use strict';

const  currentAnimationTimeMills = Date.now();
/**
 * 摩擦系数
 */
const SCROLL_FRICTION = 0.03;
/**
 * 时间间距
 */
const DEFAULT_DURATION = 250;
/**
 * 滑动模式
 */
const SCROLL_MODE = 0;

const FLING_MODE = 1;
/**
 * 减速率
 */
const DECELERATION_RATE = Math.log(0.78) / Math.log(0.9);
const INFLEXION = 0.35;
const START_TENSION = 0.5;
const END_TENSION = 1.0;
const P1 = START_TENSION * INFLEXION;
const P2 = 1.0 - END_TENSION * (1.0 - INFLEXION);
const NB_SAMPLES = 100;
const SPLINE_POSITION = [];
const SPLINE_TIME = [];
const GRAVITY_EARTH = 9.80665;

(function() {
  var x_min = 0;
  var y_min = 0;
  for (let i = 0; i < NB_SAMPLES; i ++) {
    let alpha = i / NB_SAMPLES;
    let x_max = 1;
    let x, tx, coef;
    while(true) {
      x = x_min + (x_max - x_min) / 2.0;
      coef = 3.0 * x * (1.0 - x);
      tx = coef * ((1.0 - x) * P1 + x * P2) + x * x * x;
      if (tx > alpha) x_max = x;
      else x_min = x;
    }
    SPLINE_TIME[i] = coef * ((1.0 - y) * P1 + y * P2) + y * y * y;
  }
  SPLINE_POSITION[NB_SAMPLES] = SPLINE_TIME[NB_SAMPLES] = 1.0;
})();

function signum(number) {
  if (isNaN(number)) {
    return NaN;
  }
  var sig = number;
  if (number > 0) {
    sig = 1;
  } else if (number < 0) {
    sig = -1;
  }
  return sig;
}

export default class Scroller {
  constructor(flywhell, onScrollCallback) {
    this.mCurrX = 0;
    this.mCurrY = 0;
    this.mFinished = true;
    this.mInterpolator = ViscousFluidInterpolator;
    this.mPpi = 160;
    this.mDeceleration = this.computeDeceleration(SCROLL_FRICTION);
    this.mFlywheel = flywheel;
    this.mPhysicalCoeff = this.computedDeceleration(0.84);
    this.mFlingFriction = SCROLL_FRICTION;
    this.onScrollCallback = onScrollCallback;
  }

  computeDeceleration = (friction) => {
    return GRAVITY_EARTH * 39.37 * this.mPpi * friction;
  }

  isFinished = () => {
    return this.mFinished;
  }

  forceFinished = (finished) => {
    return this.mFinished = finished;
  }

  getCurrX = () => {
    return this.mCurrX;
  }

  getCurrY = () => {
    return this.mCurrY;
  }

  getCurrVelocity = () => {
    return this.mMode === FLING_MODE ?
      this.mCurrVelocity :
      this.mVelocity - this.mDeceleration * this.timePassed() / 2000.0;
  }

  computeScrollOffset = () => {
    if (this.mFinished) {
      this.onScrollCallback && this.onScrollCallback(0, 0, this);
      return false;
    }

    var timePassed = currentAnimationTimeMillis() - this.mStartTime;

    if (timePassed < this.mDuration) {
      switch (this.mMode) {
        case SCROLL_MODE:
          let x = this.mInterpolator.getInterpolation(timePassed * this.mDurationReciprocal);
          this.mCurrX = this.mStartX + Math.round(x * this.mDeltaX);
          this.mCurrY = this.mStartY + Math.round(x * this.mDeltaY);
          break;
        case FLING_MODE:
          let t = timePassed / this.mDuration;
          let index = parseInt(NB_SAMPLES * t);
          let distanceCoef = 1;
          let velocityCoef = 0;
          if (index < NB_SAMPLES) {
            let t_inf = index / NB_SAMPLES;
            let t_sup = (index + 1) / NB_SAMPLES;
            let d_inf = SPLINE_POSITION[index];
            let d_sup = SPLINE_POSITION[index + 1];
            velocityCoef = (d_sup - d_inf) / (t_sup - t_inf);
            distanceCoef = d_inf + (t - t_inf) * velocityCoef;
          }

          this.mCurrVelocity = velocityCoef * this.mDistance / this.mDuration * 1000;
          this.mCurrX = this.mStartX + Math.round()

      }
    }
  }
}