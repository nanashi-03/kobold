import { Message } from 'discord.js';
import { RateLimiter } from 'discord.js-rate-limiter';

import { EventData } from '../models/internal-models.js';
import { Trigger } from '../triggers/index.js';
import { Config } from './../config/config.js';

export class TriggerHandler {
	private rateLimiter = new RateLimiter(
		Config.rateLimiting.triggers.amount,
		Config.rateLimiting.triggers.interval * 1000
	);

	constructor(private triggers: Trigger[]) {}

	public async process(msg: Message): Promise<void> {
		// Check if user is rate limited
		let limited = this.rateLimiter.take(msg.author.id);
		if (limited) {
			return;
		}

		// Find triggers caused by this message
		let triggers = this.triggers.filter(trigger => {
			if (trigger.requireGuild && !msg.guild) {
				return false;
			}

			if (!trigger.triggered(msg)) {
				return false;
			}

			return true;
		});

		// If this message causes no triggers then return
		if (triggers.length === 0) {
			return;
		}

		// TODO: Get data from database
		let data = new EventData();

		// Execute triggers
		for (let trigger of triggers) {
			await trigger.execute(msg, data);
		}
	}
}
