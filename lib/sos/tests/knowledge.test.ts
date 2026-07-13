import test from 'node:test'
import assert from 'node:assert/strict'
import { FAB_KNOWLEDGE, HOME_KNOWLEDGE, SOS_KNOWLEDGE, SOS_STATIC_KNOWLEDGE, SPIN_KNOWLEDGE } from '../knowledge'

test('static knowledge exports expected category groups', () => {
  assert.ok(SOS_KNOWLEDGE.length > 0)
  assert.ok(SPIN_KNOWLEDGE.length > 0)
  assert.ok(HOME_KNOWLEDGE.length > 0)
  assert.ok(FAB_KNOWLEDGE.length > 0)
})

test('all static knowledge entries have required metadata', () => {
  for (const entry of SOS_STATIC_KNOWLEDGE) {
    assert.ok(entry.id)
    assert.ok(entry.title)
    assert.ok(entry.category)
    assert.ok(entry.summary)
    assert.ok(entry.tags.length > 0)
  }
})

test('combined static knowledge includes HOME qualification tags', () => {
  const homeEntry = SOS_STATIC_KNOWLEDGE.find(entry => entry.id === 'home-qualification-checklist')

  assert.ok(homeEntry)
  assert.ok(homeEntry.tags.includes('eligibility'))
  assert.equal(homeEntry.category, 'home')
})
