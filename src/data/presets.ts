export interface PresetChoice {
  text: string;
  color: string;
  weight: number;
}

export interface PresetCategory {
  id: string;
  name: string;
  icon: string;
  description: string;
  presets: Record<string, { title: string; description: string; items: PresetChoice[] }>;
}

export const PRESET_CATEGORIES: PresetCategory[] = [
  {
    id: 'decisions',
    name: 'Decisions & Dilemmas',
    icon: 'Compass',
    description: 'Quick choices for life, fun, and everyday debates.',
    presets: {
      yes_no: {
        title: 'Yes or No',
        description: 'The ultimate 50/50 decision maker for any dilemma.',
        items: [
          { text: 'YES', color: '#10b981', weight: 1 },
          { text: 'NO', color: '#ef4444', weight: 1 },
        ],
      },
      coin: {
        title: 'Coin Flip (Heads or Tails)',
        description: 'Classic heads or tails toss for instant resolution.',
        items: [
          { text: 'Heads', color: '#f59e0b', weight: 1 },
          { text: 'Tails', color: '#6366f1', weight: 1 },
        ],
      },
      who_pays: {
        title: 'Who Pays the Bill?',
        description: 'Settle the restaurant bill fairly with random selection.',
        items: [
          { text: 'You Pay!', color: '#f59e0b', weight: 1 },
          { text: 'I Pay...', color: '#3b82f6', weight: 1 },
          { text: 'Split 50/50', color: '#8b5cf6', weight: 1 },
          { text: 'Treat from Boss', color: '#10b981', weight: 1 },
        ],
      },
      truth_or_dare: {
        title: 'Truth or Dare',
        description: 'Party favorite to break the ice and pick a challenge.',
        items: [
          { text: 'Truth', color: '#06b6d4', weight: 1 },
          { text: 'Dare', color: '#ef4444', weight: 1 },
          { text: 'Wildcard Choice', color: '#f59e0b', weight: 1 },
        ],
      },
      rpsls: {
        title: 'Rock Paper Scissors Lizard Spock',
        description: 'The expanded geek classic decision game.',
        items: [
          { text: 'Rock', color: '#ef4444', weight: 1 },
          { text: 'Paper', color: '#3b82f6', weight: 1 },
          { text: 'Scissors', color: '#f59e0b', weight: 1 },
          { text: 'Lizard', color: '#10b981', weight: 1 },
          { text: 'Spock', color: '#8b5cf6', weight: 1 },
        ],
      },
      evening_activity: {
        title: 'What to Do Tonight',
        description: 'Pick a relaxing or fun activity for your free evening.',
        items: [
          { text: 'Watch a Movie', color: '#f59e0b', weight: 1 },
          { text: 'Read a Good Book', color: '#06b6d4', weight: 1 },
          { text: 'Go for an Evening Walk', color: '#10b981', weight: 1 },
          { text: 'Play Video Games', color: '#8b5cf6', weight: 1 },
          { text: 'Cook Something Delicious', color: '#f97316', weight: 1 },
          { text: 'Board Game Night', color: '#ec4899', weight: 1 },
        ],
      },
    },
  },
  {
    id: 'food',
    name: 'Food & Dining',
    icon: 'Utensils',
    description: 'Never spend 30 minutes asking "What do you want to eat?" again.',
    presets: {
      food_cravings: {
        title: 'What Should I Eat? (Top Cravings)',
        description: 'Most popular crowd favorites for fast dinner decisions.',
        items: [
          { text: 'Pizza', color: '#ef4444', weight: 1 },
          { text: 'Sushi & Sashimi', color: '#06b6d4', weight: 1 },
          { text: 'Burgers & Fries', color: '#f59e0b', weight: 1 },
          { text: 'Street Tacos', color: '#f97316', weight: 1 },
          { text: 'Crispy Fried Chicken', color: '#eab308', weight: 1 },
          { text: 'Thai Pad See Ew', color: '#10b981', weight: 1 },
          { text: 'Italian Pasta', color: '#8b5cf6', weight: 1 },
          { text: 'Fresh Healthy Salad', color: '#14b8a6', weight: 1 },
        ],
      },
      cuisines: {
        title: 'World Cuisines',
        description: 'Select an entire culinary tradition for dinner.',
        items: [
          { text: 'Italian Cuisine', color: '#ef4444', weight: 1 },
          { text: 'Japanese Cuisine', color: '#06b6d4', weight: 1 },
          { text: 'Mexican Cuisine', color: '#10b981', weight: 1 },
          { text: 'Indian Cuisine', color: '#f59e0b', weight: 1 },
          { text: 'Thai Cuisine', color: '#f97316', weight: 1 },
          { text: 'Vietnamese Pho', color: '#8b5cf6', weight: 1 },
          { text: 'Korean BBQ', color: '#ec4899', weight: 1 },
          { text: 'Mediterranean', color: '#3b82f6', weight: 1 },
        ],
      },
      lunch_options: {
        title: 'Quick Workday Lunch',
        description: 'Fast, tasty options for busy lunch breaks.',
        items: [
          { text: 'Gourmet Sandwich', color: '#f59e0b', weight: 1 },
          { text: 'Warm Ramen Bowl', color: '#ef4444', weight: 1 },
          { text: 'Fresh Poke Bowl', color: '#06b6d4', weight: 1 },
          { text: 'Burrito Bowl', color: '#10b981', weight: 1 },
          { text: 'Soup & Sourdough', color: '#f97316', weight: 1 },
          { text: 'Caesar Salad', color: '#14b8a6', weight: 1 },
        ],
      },
      drinks: {
        title: 'Coffee & Afternoon Drinks',
        description: 'Treat yourself to your next beverage.',
        items: [
          { text: 'Iced Caramel Latte', color: '#f59e0b', weight: 1 },
          { text: 'Iced Matcha Latte', color: '#10b981', weight: 1 },
          { text: 'Brown Sugar Milk Tea', color: '#8b5cf6', weight: 1 },
          { text: 'Berry Fruit Smoothie', color: '#ef4444', weight: 1 },
          { text: 'Fresh Sparkling Lemonade', color: '#eab308', weight: 1 },
          { text: 'Cold Brew Coffee', color: '#6366f1', weight: 1 },
        ],
      },
      desserts: {
        title: 'Dessert & Sweet Treats',
        description: 'Indulge in a sweet reward.',
        items: [
          { text: 'Artisan Gelato / Ice Cream', color: '#ec4899', weight: 1 },
          { text: 'Warm Chocolate Lava Cake', color: '#8b5cf6', weight: 1 },
          { text: 'Glazed Fresh Donuts', color: '#f59e0b', weight: 1 },
          { text: 'Bakery Cookies', color: '#f97316', weight: 1 },
          { text: 'Crispy Cinnamon Churros', color: '#eab308', weight: 1 },
          { text: 'New York Cheesecake', color: '#10b981', weight: 1 },
        ],
      },
    },
  },
  {
    id: 'classroom',
    name: 'Classroom & Teams',
    icon: 'GraduationCap',
    description: 'Perfect for teachers, student calling, and agile team stands.',
    presets: {
      students_sample: {
        title: 'Random Student Caller',
        description: 'Call on students fairly without bias during class.',
        items: [
          { text: 'Alex Johnson', color: '#ef4444', weight: 1 },
          { text: 'Bella Chen', color: '#f97316', weight: 1 },
          { text: 'Carlos Ramirez', color: '#f59e0b', weight: 1 },
          { text: 'Diana Kim', color: '#10b981', weight: 1 },
          { text: 'Ethan Patel', color: '#06b6d4', weight: 1 },
          { text: 'Fiona White', color: '#3b82f6', weight: 1 },
          { text: 'Gabriel Torres', color: '#8b5cf6', weight: 1 },
          { text: 'Hannah Scott', color: '#ec4899', weight: 1 },
        ],
      },
      group_roles: {
        title: 'Group Project Roles',
        description: 'Assign project responsibilities automatically.',
        items: [
          { text: 'Team Leader', color: '#f59e0b', weight: 1 },
          { text: 'Lead Researcher', color: '#06b6d4', weight: 1 },
          { text: 'Slide & Visual Designer', color: '#ec4899', weight: 1 },
          { text: 'Main Presenter', color: '#10b981', weight: 1 },
          { text: 'Timekeeper & Quality Editor', color: '#8b5cf6', weight: 1 },
        ],
      },
      standup_order: {
        title: 'Daily Agile Standup Order',
        description: 'Randomize speaker order to keep morning meetings fresh.',
        items: [
          { text: 'Frontend Engineering', color: '#06b6d4', weight: 1 },
          { text: 'Backend & APIs', color: '#3b82f6', weight: 1 },
          { text: 'Product & UX Design', color: '#ec4899', weight: 1 },
          { text: 'QA & Automation Testing', color: '#10b981', weight: 1 },
          { text: 'Product Management', color: '#f59e0b', weight: 1 },
          { text: 'DevOps & Infrastructure', color: '#8b5cf6', weight: 1 },
        ],
      },
      icebreakers: {
        title: 'Icebreaker Questions',
        description: 'Prompt team members to share and connect.',
        items: [
          { text: 'Share your favorite childhood movie', color: '#ef4444', weight: 1 },
          { text: 'What is your top bucket-list travel spot?', color: '#06b6d4', weight: 1 },
          { text: 'Reveal an unexpected hidden talent', color: '#f59e0b', weight: 1 },
          { text: 'What was your first concert or album?', color: '#8b5cf6', weight: 1 },
          { text: 'What is your favorite comfort food meal?', color: '#10b981', weight: 1 },
          { text: 'If you had a superpower for a day, what would it be?', color: '#ec4899', weight: 1 },
        ],
      },
    },
  },
  {
    id: 'games_numbers',
    name: 'Games & Numbers',
    icon: 'Dices',
    description: 'Fair random numbers, dice rolls, and gaming utilities.',
    presets: {
      dice_d6: {
        title: 'Standard 6-Sided Die (D6)',
        description: 'Classic single die roll with standard pip notation.',
        items: [
          { text: 'One (1)', color: '#ef4444', weight: 1 },
          { text: 'Two (2)', color: '#f97316', weight: 1 },
          { text: 'Three (3)', color: '#f59e0b', weight: 1 },
          { text: 'Four (4)', color: '#10b981', weight: 1 },
          { text: 'Five (5)', color: '#3b82f6', weight: 1 },
          { text: 'Six (6)', color: '#8b5cf6', weight: 1 },
        ],
      },
      numbers_1_to_10: {
        title: 'Numbers 1 to 10',
        description: 'Pick a random number between 1 and 10.',
        items: [
          { text: 'Number 1', color: '#ef4444', weight: 1 },
          { text: 'Number 2', color: '#f97316', weight: 1 },
          { text: 'Number 3', color: '#f59e0b', weight: 1 },
          { text: 'Number 4', color: '#eab308', weight: 1 },
          { text: 'Number 5', color: '#10b981', weight: 1 },
          { text: 'Number 6', color: '#06b6d4', weight: 1 },
          { text: 'Number 7', color: '#3b82f6', weight: 1 },
          { text: 'Number 8', color: '#6366f1', weight: 1 },
          { text: 'Number 9', color: '#8b5cf6', weight: 1 },
          { text: 'Number 10', color: '#ec4899', weight: 1 },
        ],
      },
      magic_8_ball: {
        title: 'Magic 8-Ball Oracle',
        description: 'Consult the mystical fortune teller.',
        items: [
          { text: 'It is certain', color: '#10b981', weight: 1 },
          { text: 'Without a doubt', color: '#06b6d4', weight: 1 },
          { text: 'Most likely', color: '#3b82f6', weight: 1 },
          { text: 'Reply hazy, ask again', color: '#f59e0b', weight: 1 },
          { text: 'Better not tell you now', color: '#f97316', weight: 1 },
          { text: 'Don’t count on it', color: '#ef4444', weight: 1 },
          { text: 'My sources say NO', color: '#dc2626', weight: 1 },
        ],
      },
      rainbow_colors: {
        title: 'Colors of the Rainbow',
        description: 'Select a random color palette.',
        items: [
          { text: 'Passionate Red', color: '#ef4444', weight: 1 },
          { text: 'Vibrant Orange', color: '#f97316', weight: 1 },
          { text: 'Bright Yellow', color: '#f59e0b', weight: 1 },
          { text: 'Lush Green', color: '#10b981', weight: 1 },
          { text: 'Ocean Blue', color: '#06b6d4', weight: 1 },
          { text: 'Deep Indigo', color: '#6366f1', weight: 1 },
          { text: 'Royal Violet', color: '#8b5cf6', weight: 1 },
        ],
      },
    },
  },
];

// Flat map for direct key access
export const ALL_PRESETS_MAP: Record<string, PresetChoice[]> = {};

PRESET_CATEGORIES.forEach((category) => {
  Object.entries(category.presets).forEach(([key, preset]) => {
    ALL_PRESETS_MAP[key] = preset.items;
  });
});
