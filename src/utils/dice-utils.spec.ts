import { CharacterFactory } from './../services/kobold/models/character/character.factory';
import { RollBuilder, DiceUtils } from './dice-utils';
describe('Dice Utils', function () {
	describe('buildDiceExpression', function () {
		test('builds a dice expression using a base expression, a bonus, and a modifier', function () {
			const result = DiceUtils.buildDiceExpression('d10', '5', '2d4');
			expect(result).toBe('d10+5+(2d4)');
		});
		test('handles negative bonuses and modifiers properly', function () {
			const result = DiceUtils.buildDiceExpression('d10', '-5', '-2d4');
			expect(result).toBe('d10-5+(-2d4)');
		});
		test('Allows a bonus or modifier to have a + symbol without inputting ++', function () {
			const result = DiceUtils.buildDiceExpression('d10', '+5', '+2d4');
			expect(result).toBe('d10+5+(+2d4)');
		});
		test('allows for base dice with no modifier', function () {
			const result = DiceUtils.buildDiceExpression('d10', '5');
			expect(result).toBe('d10+5');
		});
		test('allows for base dice with no bonus', function () {
			const result = DiceUtils.buildDiceExpression('d10', null, '2d4');
			expect(result).toBe('d10+(2d4)');
		});
		test('allows for just base dice', function () {
			const result = DiceUtils.buildDiceExpression('d10');
			expect(result).toBe('d10');
		});
		test('defaults a lack of base dice to d20', function () {
			const result = DiceUtils.buildDiceExpression(null, '+5');
			expect(result).toBe('d20+5');
		});
	});
	describe('parseDiceFromWgDamageField', function () {
		test('removes valid damage type from the end of a dice expression', function () {
			const dice = DiceUtils.parseDiceFromWgDamageField('d20 - 5 electric');
			expect(dice).toBe('d20 - 5');
			const otherDice = DiceUtils.parseDiceFromWgDamageField(
				'{( 2 / 5 )d20kl...10} >= 14 fire or mental'
			);
			expect(otherDice).toBe('{( 2 / 5 )d20kl...10} >= 14');
		});
		test(`doesn't remove test that might be in the middle of a roll expression`, function () {
			const dice = DiceUtils.parseDiceFromWgDamageField('d20 - 5 electric + 5');
			expect(dice).toBe('d20 - 5 electric + 5');
			const otherDice = DiceUtils.parseDiceFromWgDamageField(
				'{( 2 / 5 fire )d20kl...10} >= 14'
			);
			expect(otherDice).toBe('{( 2 / 5 fire )d20kl...10} >= 14');
		});
	});
});

describe('RollBuilder', function () {
	test('rolls dice without a character', function () {
		const rollBuilder = new RollBuilder({
			actorName: 'testname',
			character: null,
		});
		rollBuilder.addRoll('d20+1', 'testRoll');
		rollBuilder.addRoll('d4+1', 'testRoll2');
		const result = rollBuilder.compileEmbed();
		const diceField1 = result.data.fields.find(field => field.name === 'testRoll');
		const diceField2 = result.data.fields.find(field => field.name === 'testRoll2');
		expect(diceField1.value).toContain('d20+1');
		expect(diceField2.value).toContain('d4+1');
		expect(result.data.title.toLowerCase()).toContain('testname');
	});
	test(`making a single roll puts the roll value in the description and ignores the title`, function () {
		const rollBuilder = new RollBuilder({
			actorName: 'testname',
			character: null,
		});
		rollBuilder.addRoll('d20+1', 'testRoll');
		const result = rollBuilder.compileEmbed();
		const diceField = (result.data?.fields || []).find(field => field.name === 'testRoll');
		expect(result.data.title.toLowerCase()).toContain('testname');
		expect(result.data.title.toLowerCase()).not.toContain('testRoll');
		expect(result.data.description).toContain('d20+1');
		expect(diceField).toBeUndefined();
	});
	test(`when referencing a character, applies the character's name and image to the embed`, function () {
		const fakeCharacter = CharacterFactory.build();
		const rollBuilder = new RollBuilder({
			character: fakeCharacter,
		});
		rollBuilder.addRoll('d6+1', 'testRoll');
		const result = rollBuilder.compileEmbed();
		expect(result.data.title.toLowerCase()).toContain(
			fakeCharacter.characterData.name.toLowerCase()
		);
		expect(result.data.thumbnail.url).toBe(fakeCharacter.characterData?.infoJSON?.imageURL);
	});
	test(`allows a custom rollnote`, function () {
		const rollBuilder = new RollBuilder({
			rollNote: 'testing!',
		});
		rollBuilder.addRoll('d6+1', 'testRoll');
		const result = rollBuilder.compileEmbed();
		expect(result.data.footer.text).toBe('testing!');
	});
	test(`allows a title that will overwrite any otherwise generated title`, function () {
		const fakeCharacter = CharacterFactory.build();
		const rollBuilder = new RollBuilder({
			character: fakeCharacter,
			actorName: 'some actor',
			title: `an entirely different title`,
		});
		rollBuilder.addRoll('d6+1', 'testRoll');
		const result = rollBuilder.compileEmbed();
		expect(result.data.title.toLowerCase()).not.toContain(fakeCharacter.characterData.name);
		expect(result.data.title.toLowerCase()).not.toContain('some actor');
		expect(result.data.title.toLowerCase()).toBe(`an entirely different title`);
	});
	test('records errors if something causes a thrown error', function () {
		const rollBuilder = new RollBuilder({});
		rollBuilder.addRoll('d10', 'testRoll');
		//temporarily disable the console for the error test
		const temp = console.warn;
		console.warn = (...args) => {};
		rollBuilder.addRoll('dd6++1', 'errorRoll');
		console.warn = temp;
		const result = rollBuilder.compileEmbed();
		const errorRollField = result.data.fields.find(field => field.name === 'errorRoll');
		expect(errorRollField.value).toContain("Yip! We didn't understand the dice roll");
	});
	test('records errors if the dice expression is not allowed', function () {
		const rollBuilder = new RollBuilder({});
		rollBuilder.addRoll('d10', 'testRoll');
		rollBuilder.addRoll('500d6', 'errorRoll');
		const result = rollBuilder.compileEmbed();
		const errorRollField = result.data.fields.find(field => field.name === 'errorRoll');
		expect(errorRollField.value).toContain("Yip! We didn't understand the dice roll");
	});
	test('parses an attribute', function () {
		const character = CharacterFactory.build({
			attributes: [
				{
					name: 'test',
					type: 'base',
					value: 7,
					tags: [],
				},
			],
			customAttributes: [],
		});
		const rollBuilder = new RollBuilder({ character });
		expect(rollBuilder.parseAttribute('[test]')).toBe('(7)');
	});
	test('parses a custom attribute', function () {
		const character = CharacterFactory.build({
			customAttributes: [
				{
					name: 'custom',
					type: 'base',
					value: 3,
					tags: [],
				},
			],
			attributes: [],
		});
		const rollBuilder = new RollBuilder({ character });
		expect(rollBuilder.parseAttribute('[custom]')).toBe('(3)');
	});
	test('parses custom over base when multiple attributes are present', function () {
		const character = CharacterFactory.build({
			attributes: [
				{
					name: 'same',
					type: 'base',
					value: 8,
					tags: [],
				},
			],
			customAttributes: [
				{
					name: 'same',
					type: 'base',
					value: 4,
					tags: [],
				},
			],
		});
		const rollBuilder = new RollBuilder({ character });
		expect(rollBuilder.parseAttribute('[same]')).toBe('(4)');
	});
	test('fails to parse an invalid attribute', function () {
		const rollBuilder = new RollBuilder({});
		expect(rollBuilder.parseAttribute('[same]')).toBe('([same])');
	});
	test('parses an attribute using a shorthand value', function () {
		const character = CharacterFactory.build({
			attributes: [
				{
					name: 'strength',
					type: 'base',
					value: 11,
					tags: [],
				},
			],
			customAttributes: [],
		});
		const rollBuilder = new RollBuilder({ character });
		expect(rollBuilder.parseAttribute('[str]')).toBe('(11)');
	});
	test('parses all attributes in a dice expression', function () {
		const character = CharacterFactory.build({
			attributes: [
				{
					name: 'base',
					type: 'base',
					value: 8,
					tags: [],
				},
			],
			customAttributes: [
				{
					name: 'custom',
					type: 'base',
					value: 4,
					tags: [],
				},
			],
		});
		const rollBuilder = new RollBuilder({ character });
		expect(rollBuilder.parseAttributes('[custom]d20 + [base] - [custom]')).toBe(
			'(4)d20 + (8) - (4)'
		);
	});
	test('rolls dice using parsed character attributes', function () {
		const character = CharacterFactory.build({
			attributes: [
				{
					name: 'base',
					type: 'base',
					value: 8,
					tags: [],
				},
			],
			customAttributes: [
				{
					name: 'custom',
					type: 'base',
					value: 4,
					tags: [],
				},
			],
		});
		const rollBuilder = new RollBuilder({ character });
		rollBuilder.addRoll('[custom]d20 + [base] - [custom]', 'attribute roll');
		expect(rollBuilder.rollResults[0]?.value).toBeTruthy();
	});
});
