/* tslint:disable */
/**
 * This file was automatically generated by json-schema-to-typescript.
 * DO NOT MODIFY IT BY HAND. Instead, modify the source JSONSchema file,
 * and run json-schema-to-typescript to regenerate this file.
 */

/**
 * An imported character
 */
export interface Character {
	/**
	 * The id of the character record.
	 */
	id?: number;
	/**
	 * The external wanderer's guide character id.
	 */
	charId?: number;
	/**
	 * The discord id of the user who imported the character
	 */
	userId?: string;
	/**
	 * The general character data from the Wanderer's guide API /character endpoint
	 */
	characterData?: {
		[k: string]: any;
	};
	/**
	 * The computed base stat block from the Wanderer's guide API /character/calculated-stats endpoint
	 */
	calculatedStats?: {
		[k: string]: any;
	};
	/**
	 * whether this is the active character for the user's character based commands
	 */
	isActiveCharacter?: boolean;
	/**
	 * When the character was first imported
	 */
	createdAt?: string;
	/**
	 * When the character was last updated
	 */
	lastUpdatedAt?: string;
	[k: string]: any;
}
