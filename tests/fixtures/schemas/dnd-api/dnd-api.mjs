export const main = {
    namespace: 'dndapi',
    name: 'D&D 5th Edition API',
    description: 'Access the D&D 5th Edition SRD API with complete game reference data. Look up classes, spells, monsters, races, equipment, and more from the System Reference Document. Covers all SRD content including 320+ spells, 300+ monsters, 12 classes, and 9 races. Free, no API key required.',
    version: '3.0.0',
    docs: ['https://5e-bits.github.io/docs/'],
    tags: ['entertainment', 'gaming', 'reference', 'opendata', 'cacheTtlStatic'],
    root: 'https://www.dnd5eapi.co',
    requiredServerParams: [],
    headers: {},
    tools: {
        listClasses: {
            method: 'GET',
            path: '/api/2014/classes',
            description: 'List all 12 D&D character classes. Returns class names and index keys for use with getClass to retrieve full details.',
            parameters: [],
            tests: [
                { _description: 'List all classes' }
            ],
            output: {
                mimeType: 'application/json',
                schema: {
                    type: 'object',
                    description: 'Paginated list of all D&D 5e character classes',
                    properties: {
                        count: { type: 'number', description: 'Total number of classes available' },
                        results: { type: 'array', description: 'Array of class summary objects', items: { type: 'object', properties: { index: { type: 'string', description: 'URL-safe identifier used as path parameter in getClass (e.g. "wizard")' }, name: { type: 'string', description: 'Human-readable class name (e.g. "Wizard")' }, url: { type: 'string', description: 'Relative API path to the full class resource' } } } }
                    }
                }
            }
        },
        getSpell: {
            method: 'GET',
            path: '/api/2014/spells/:index',
            description: 'Get detailed spell information by index name. Returns spell level, school, casting time, range, components, duration, description, damage, and which classes can use it. Use searchSpells to find spell index values.',
            parameters: [
                { position: { key: 'index', value: '{{USER_PARAM}}', location: 'insert' }, z: { primitive: 'string()', options: [] } }
            ],
            tests: [
                { _description: 'Get Fireball', index: 'fireball' },
                { _description: 'Get Magic Missile', index: 'magic-missile' },
                { _description: 'Get Cure Wounds', index: 'cure-wounds' }
            ],
            output: {
                mimeType: 'application/json',
                schema: {
                    type: 'object',
                    description: 'Complete spell details from the SRD',
                    properties: {
                        index: { type: 'string', description: 'URL-safe spell identifier' },
                        name: { type: 'string', description: 'Human-readable spell name' },
                        level: { type: 'number', description: 'Spell level (0 for cantrips, 1-9 for leveled spells)' },
                        school: { type: 'object', description: 'Magic school this spell belongs to', properties: { name: { type: 'string', description: 'School name (e.g. Evocation, Abjuration)' } } },
                        casting_time: { type: 'string', description: 'Time required to cast (e.g. "1 action", "1 bonus action")' },
                        range: { type: 'string', description: 'Spell range (e.g. "150 feet", "Touch", "Self")' },
                        components: { type: 'array', description: 'Required components: V (verbal), S (somatic), M (material)' },
                        duration: { type: 'string', description: 'How long the spell lasts (e.g. "Instantaneous", "Concentration, up to 1 minute")' },
                        desc: { type: 'array', items: { type: 'string' }, description: 'Spell description paragraphs explaining the effect' },
                        damage: { type: 'object', description: 'Damage details including type and scaling (null for non-damage spells)' },
                        classes: { type: 'array', description: 'List of classes that can learn this spell' }
                    }
                }
            }
        },
        getMonster: {
            method: 'GET',
            path: '/api/2014/monsters/:index',
            description: 'Get detailed monster stat block by index name. Returns hit points, armor class, ability scores, actions, legendary actions, challenge rating, and XP.',
            parameters: [
                { position: { key: 'index', value: '{{USER_PARAM}}', location: 'insert' }, z: { primitive: 'string()', options: [] } }
            ],
            tests: [
                { _description: 'Get Aboleth', index: 'aboleth' },
                { _description: 'Get Adult Red Dragon', index: 'adult-red-dragon' },
                { _description: 'Get Goblin', index: 'goblin' }
            ],
            output: {
                mimeType: 'application/json',
                schema: {
                    type: 'object',
                    description: 'Complete monster stat block from the SRD',
                    properties: {
                        index: { type: 'string', description: 'URL-safe monster identifier' },
                        name: { type: 'string', description: 'Human-readable monster name' },
                        size: { type: 'string', description: 'Size category: Tiny, Small, Medium, Large, Huge, Gargantuan' },
                        type: { type: 'string', description: 'Creature type (e.g. aberration, dragon, humanoid)' },
                        alignment: { type: 'string', description: 'Typical alignment (e.g. "lawful evil", "chaotic good")' },
                        armor_class: { type: 'array', description: 'Armor class entries with value and optional armor type' },
                        hit_points: { type: 'number', description: 'Average hit points' },
                        hit_dice: { type: 'string', description: 'Hit dice formula (e.g. "18d10+36")' },
                        speed: { type: 'object', description: 'Movement speeds by type (walk, fly, swim, burrow, climb) in feet' },
                        strength: { type: 'number', description: 'Strength ability score (1-30)' },
                        dexterity: { type: 'number', description: 'Dexterity ability score (1-30)' },
                        constitution: { type: 'number', description: 'Constitution ability score (1-30)' },
                        intelligence: { type: 'number', description: 'Intelligence ability score (1-30)' },
                        wisdom: { type: 'number', description: 'Wisdom ability score (1-30)' },
                        charisma: { type: 'number', description: 'Charisma ability score (1-30)' },
                        actions: { type: 'array', description: 'Available combat actions with attack bonuses and damage' },
                        challenge_rating: { type: 'number', description: 'Challenge rating indicating difficulty (0-30)' },
                        xp: { type: 'number', description: 'Experience points awarded for defeating this monster' }
                    }
                }
            }
        },
        searchSpells: {
            method: 'GET',
            path: '/api/2014/spells',
            description: 'Search and filter spells by name. Returns spell index values that can be passed to getSpell for full details.',
            parameters: [
                { position: { key: 'name', value: '{{USER_PARAM}}', location: 'query' }, z: { primitive: 'string()', options: ['optional()'] } }
            ],
            tests: [
                { _description: 'Search fire spells', name: 'fire' },
                { _description: 'List all spells', name: 'fire' },
                { _description: 'Search healing spells', name: 'heal' }
            ],
            output: {
                mimeType: 'application/json',
                schema: {
                    type: 'object',
                    description: 'Paginated list of spells matching the search filter',
                    properties: {
                        count: { type: 'number', description: 'Number of matching spells' },
                        results: { type: 'array', description: 'Array of spell summaries', items: { type: 'object', properties: { index: { type: 'string', description: 'URL-safe spell identifier for use with getSpell' }, name: { type: 'string', description: 'Human-readable spell name' }, level: { type: 'number', description: 'Spell level (0 for cantrips)' }, url: { type: 'string', description: 'Relative API path to the full spell resource' } } } }
                    }
                }
            }
        },
        getClass: {
            method: 'GET',
            path: '/api/2014/classes/:index',
            description: 'Get detailed class information by index name. Returns hit die, proficiencies, saving throws, starting equipment, and spellcasting info. Use listClasses to find valid index values.',
            parameters: [
                { position: { key: 'index', value: '{{USER_PARAM}}', location: 'insert' }, z: { primitive: 'string()', options: [] } }
            ],
            tests: [
                { _description: 'Get Wizard class', index: 'wizard' },
                { _description: 'Get Fighter class', index: 'fighter' },
                { _description: 'Get Cleric class', index: 'cleric' }
            ],
            output: {
                mimeType: 'application/json',
                schema: {
                    type: 'object',
                    description: 'Complete class details from the SRD',
                    properties: {
                        index: { type: 'string', description: 'URL-safe class identifier' },
                        name: { type: 'string', description: 'Human-readable class name' },
                        hit_die: { type: 'number', description: 'Hit die size (e.g. 6 for d6, 10 for d10)' },
                        proficiency_choices: { type: 'array', description: 'Skill and tool proficiency choices available at level 1' },
                        proficiencies: { type: 'array', description: 'Automatic proficiencies (armor, weapons, tools, saving throws)' },
                        saving_throws: { type: 'array', description: 'Ability scores used for saving throw proficiency' },
                        starting_equipment: { type: 'array', description: 'Default equipment received at level 1' },
                        class_levels: { type: 'string', description: 'API URL for level-by-level feature progression' },
                        spellcasting: { type: 'object', description: 'Spellcasting details (null for non-casters like Fighter)' }
                    }
                }
            }
        }
    }
}
