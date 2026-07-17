import test from 'node:test'
import assert from 'node:assert/strict'
import {
  calculateTrialWeightedScore,
  TRIAL_WEIGHTED_SCORING_PROFILE,
  trialWeightTotal,
} from '../evaluation/weighted-scoring'

test('trial scoring weights total exactly 100 percent', () => {
  assert.equal(trialWeightTotal(), 100)
  assert.deepEqual(TRIAL_WEIGHTED_SCORING_PROFILE.weights, {
    approaching: 10,
    probing: 15,
    home_qualification: 20,
    solution_presentation: 15,
    objection_handling: 15,
    closing: 10,
    communication: 10,
    compliance: 5,
  })
})

test('weighted scoring uses all dimensions and rounds once at the end', () => {
  const result = calculateTrialWeightedScore({
    approaching: 80,
    probing: 70,
    home_qualification: 60,
    solution_presentation: 75,
    objection_handling: 65,
    closing: 70,
    communication: 80,
    compliance: 90,
  })

  assert.equal(result.profileId, 'trial-weighted-v1')
  assert.equal(result.weightedScore, 71)
  assert.equal(result.dimensions.length, 8)
  assert.equal(result.dimensions.find(item => item.key === 'home_qualification')?.contribution, 12)
})

test('missing and malformed dimension scores normalize to zero', () => {
  const result = calculateTrialWeightedScore(new Map([
    ['approaching', 120],
    ['probing', Number.NaN],
    ['communication', -20],
  ]))

  assert.equal(result.dimensions.find(item => item.key === 'approaching')?.score, 100)
  assert.equal(result.dimensions.find(item => item.key === 'probing')?.score, 0)
  assert.equal(result.dimensions.find(item => item.key === 'communication')?.score, 0)
  assert.equal(result.weightedScore, 10)
})
