export type Difficulty = 'easy' | 'medium' | 'hard';

export interface DSAQuestion {
  id: string;
  slug: string;
  title: string;
  difficulty: Difficulty;
  pattern: string;
  problemStatement: string;
  examples: {
    input: string;
    output: string;
    explanation?: string;
  }[];
  constraints: string[];
  starterCode: {
    python: string;
    cpp: string;
    java: string;
    javascript: string;
  };
  hints: string[];
  approach: string;
  timeComplexity: string;
  spaceComplexity: string;
}

export interface DSASheet {
  id: string;
  slug: string;
  title: string;
  shortDescription: string;
  description: string;
  estimatedHours: number;
  patternCount: number;
  questions: DSAQuestion[];
}

export const PUBLIC_DSA_SHEETS: DSASheet[] = [
  {
    id: 'sheet-arrays-hashing',
    slug: 'arrays-and-hashing',
    title: 'Arrays & Hashing Starter',
    shortDescription: 'Master fundamental array manipulation, hash sets, and hash maps for O(1) lookups.',
    description: 'The foundation of technical interviews and competitive problem solving. Learn how frequency counters and lookup hash maps turn brute-force O(N²) solutions into optimal O(N) algorithms.',
    estimatedHours: 4,
    patternCount: 3,
    questions: [
      {
        id: 'q-two-sum',
        slug: 'two-sum',
        title: 'Two Sum',
        difficulty: 'easy',
        pattern: 'Hash Map Lookup',
        problemStatement: 'Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target. You may assume that each input would have exactly one solution, and you may not use the same element twice. You can return the answer in any order.',
        examples: [
          {
            input: 'nums = [2,7,11,15], target = 9',
            output: '[0,1]',
            explanation: 'Because nums[0] + nums[1] == 9, we return [0, 1].'
          },
          {
            input: 'nums = [3,2,4], target = 6',
            output: '[1,2]'
          }
        ],
        constraints: [
          '2 <= nums.length <= 10^4',
          '-10^9 <= nums[i] <= 10^9',
          '-10^9 <= target <= 10^9',
          'Only one valid answer exists.'
        ],
        starterCode: {
          python: `class Solution:\n    def twoSum(self, nums: list[int], target: int) -> list[int]:\n        # Use a hash map to store complement -> index\n        seen = {}\n        for i, n in enumerate(nums):\n            diff = target - n\n            if diff in seen:\n                return [seen[diff], i]\n            seen[n] = i\n        return []`,
          cpp: `class Solution {\npublic:\n    vector<int> twoSum(vector<int>& nums, int target) {\n        unordered_map<int, int> seen;\n        for (int i = 0; i < nums.size(); ++i) {\n            int diff = target - nums[i];\n            if (seen.find(diff) != seen.end()) return {seen[diff], i};\n            seen[nums[i]] = i;\n        }\n        return {};\n    }\n};`,
          java: `class Solution {\n    public int[] twoSum(int[] nums, int target) {\n        Map<Integer, Integer> seen = new HashMap<>();\n        for (int i = 0; i < nums.length; i++) {\n            int diff = target - nums[i];\n            if (seen.containsKey(diff)) return new int[]{seen.get(diff), i};\n            seen.put(nums[i], i);\n        }\n        return new int[]{};\n    }\n}`,
          javascript: `function twoSum(nums, target) {\n  const seen = new Map();\n  for (let i = 0; i < nums.length; i++) {\n    const diff = target - nums[i];\n    if (seen.has(diff)) return [seen.get(diff), i];\n    seen.set(nums[i], i);\n  }\n  return [];\n}`
        },
        hints: [
          'A brute force approach tests every pair in O(N^2) time. Can we do better using extra space?',
          'For each number x, what value y do we need to reach the target? Store elements in a hash map as you traverse.'
        ],
        approach: 'Single-pass Hash Map: Iterate through nums. For each element num, compute complement = target - num. If complement is in our map, return current index and complement index. Otherwise, add num to map.',
        timeComplexity: 'O(N)',
        spaceComplexity: 'O(N)'
      },
      {
        id: 'q-contains-duplicate',
        slug: 'contains-duplicate',
        title: 'Contains Duplicate',
        difficulty: 'easy',
        pattern: 'Hash Set Uniqueness',
        problemStatement: 'Given an integer array nums, return true if any value appears at least twice in the array, and return false if every element is distinct.',
        examples: [
          {
            input: 'nums = [1,2,3,1]',
            output: 'true'
          },
          {
            input: 'nums = [1,2,3,4]',
            output: 'false'
          }
        ],
        constraints: [
          '1 <= nums.length <= 10^5',
          '-10^9 <= nums[i] <= 10^9'
        ],
        starterCode: {
          python: `class Solution:\n    def containsDuplicate(self, nums: list[int]) -> bool:\n        seen = set()\n        for n in nums:\n            if n in seen:\n                return True\n            seen.add(n)\n        return False`,
          cpp: `class Solution {\npublic:\n    bool containsDuplicate(vector<int>& nums) {\n        unordered_set<int> seen;\n        for (int n : nums) {\n            if (seen.count(n)) return true;\n            seen.insert(n);\n        }\n        return false;\n    }\n};`,
          java: `class Solution {\n    public boolean containsDuplicate(int[] nums) {\n        Set<Integer> seen = new HashSet<>();\n        for (int n : nums) {\n            if (!seen.add(n)) return true;\n        }\n        return false;\n    }\n}`,
          javascript: `function containsDuplicate(nums) {\n  const seen = new Set();\n  for (const n of nums) {\n    if (seen.has(n)) return true;\n    seen.add(n);\n  }\n  return false;\n}`
        },
        hints: [
          'A set data structure stores only unique elements.',
          'Compare the length of the original list with the length of a set created from it.'
        ],
        approach: 'Iterate through the array and store seen values in a Hash Set. If an element already exists in the set, a duplicate is found.',
        timeComplexity: 'O(N)',
        spaceComplexity: 'O(N)'
      },
      {
        id: 'q-valid-anagram',
        slug: 'valid-anagram',
        title: 'Valid Anagram',
        difficulty: 'easy',
        pattern: 'Frequency Counter',
        problemStatement: 'Given two strings s and t, return true if t is an anagram of s, and false otherwise. An Anagram is a word or phrase formed by rearranging the letters of a different word or phrase, typically using all the original letters exactly once.',
        examples: [
          {
            input: 's = "anagram", t = "nagaram"',
            output: 'true'
          },
          {
            input: 's = "rat", t = "car"',
            output: 'false'
          }
        ],
        constraints: [
          '1 <= s.length, t.length <= 5 * 10^4',
          's and t consist of lowercase English letters.'
        ],
        starterCode: {
          python: `class Solution:\n    def isAnagram(self, s: str, t: str) -> bool:\n        if len(s) != len(t): return False\n        counts = [0] * 26\n        for c1, c2 in zip(s, t):\n            counts[ord(c1) - ord('a')] += 1\n            counts[ord(c2) - ord('a')] -= 1\n        return all(c == 0 for c in counts)`,
          cpp: `class Solution {\npublic:\n    bool isAnagram(string s, string t) {\n        if (s.length() != t.length()) return false;\n        int counts[26] = {0};\n        for (int i = 0; i < s.length(); ++i) {\n            counts[s[i] - 'a']++;\n            counts[t[i] - 'a']--;\n        }\n        for (int c : counts) if (c != 0) return false;\n        return true;\n    }\n};`,
          java: `class Solution {\n    public boolean isAnagram(String s, String t) {\n        if (s.length() != t.length()) return false;\n        int[] counts = new int[26];\n        for (int i = 0; i < s.length(); i++) {\n            counts[s.charAt(i) - 'a']++;\n            counts[t.charAt(i) - 'a']--;\n        }\n        for (int c : counts) if (c != 0) return false;\n        return true;\n    }\n}`,
          javascript: `function isAnagram(s, t) {\n  if (s.length !== t.length) return false;\n  const counts = new Array(26).fill(0);\n  for (let i = 0; i < s.length; i++) {\n    counts[s.charCodeAt(i) - 97]++;\n    counts[t.charCodeAt(i) - 97]--;\n  }\n  return counts.every((c) => c === 0);\n}`
        },
        hints: [
          'If the lengths differ, they cannot be anagrams.',
          'Count character occurrences in both strings and compare counts.'
        ],
        approach: 'Count frequency of each character across an alphabet array of size 26. Increment for string s and decrement for string t. All values must resolve to zero.',
        timeComplexity: 'O(N)',
        spaceComplexity: 'O(1) (fixed alphabet of 26 letters)'
      },
      {
        id: 'q-best-time-stock',
        slug: 'best-time-to-buy-and-sell-stock',
        title: 'Best Time to Buy and Sell Stock',
        difficulty: 'easy',
        pattern: 'Running Minimum Tracker',
        problemStatement: 'You are given an array prices where prices[i] is the price of a given stock on the ith day. You want to maximize your profit by choosing a single day to buy one stock and choosing a different day in the future to sell that stock. Return the maximum profit you can achieve from this transaction. If you cannot achieve any profit, return 0.',
        examples: [
          {
            input: 'prices = [7,1,5,3,6,4]',
            output: '5',
            explanation: 'Buy on day 2 (price = 1) and sell on day 5 (price = 6), profit = 6-1 = 5.'
          },
          {
            input: 'prices = [7,6,4,3,1]',
            output: '0',
            explanation: 'In this case, no transactions are done and the max profit = 0.'
          }
        ],
        constraints: [
          '1 <= prices.length <= 10^5',
          '0 <= prices[i] <= 10^4'
        ],
        starterCode: {
          python: `class Solution:\n    def maxProfit(self, prices: list[int]) -> int:\n        min_price = float('inf')\n        max_profit = 0\n        for p in prices:\n            if p < min_price:\n                min_price = p\n            elif p - min_price > max_profit:\n                max_profit = p - min_price\n        return max_profit`,
          cpp: `class Solution {\npublic:\n    int maxProfit(vector<int>& prices) {\n        int minPrice = INT_MAX, maxProfit = 0;\n        for (int p : prices) {\n            minPrice = min(minPrice, p);\n            maxProfit = max(maxProfit, p - minPrice);\n        }\n        return maxProfit;\n    }\n};`,
          java: `class Solution {\n    public int maxProfit(int[] prices) {\n        int minPrice = Integer.MAX_VALUE, maxProfit = 0;\n        for (int p : prices) {\n            minPrice = Math.min(minPrice, p);\n            maxProfit = Math.max(maxProfit, p - minPrice);\n        }\n        return maxProfit;\n    }\n}`,
          javascript: `function maxProfit(prices) {\n  let minPrice = Infinity, maxProfit = 0;\n  for (const p of prices) {\n    if (p < minPrice) minPrice = p;\n    else if (p - minPrice > maxProfit) maxProfit = p - minPrice;\n  }\n  return maxProfit;\n}`
        },
        hints: [
          'Track the lowest buy price seen so far as you iterate through the days.',
          'At each day, calculate current profit if sold today, and update the global maximum.'
        ],
        approach: 'Maintain a running minimum price. On each day, update min_price and calculate current profit. Keep the maximum profit encountered.',
        timeComplexity: 'O(N)',
        spaceComplexity: 'O(1)'
      },
      {
        id: 'q-maximum-subarray',
        slug: 'maximum-subarray',
        title: 'Maximum Subarray (Kadane)',
        difficulty: 'medium',
        pattern: "Kadane's Algorithm",
        problemStatement: 'Given an integer array nums, find the subarray with the largest sum, and return its sum.',
        examples: [
          {
            input: 'nums = [-2,1,-3,4,-1,2,1,-5,4]',
            output: '6',
            explanation: 'The subarray [4,-1,2,1] has the largest sum 6.'
          },
          {
            input: 'nums = [1]',
            output: '1'
          }
        ],
        constraints: [
          '1 <= nums.length <= 10^5',
          '-10^4 <= nums[i] <= 10^4'
        ],
        starterCode: {
          python: `class Solution:\n    def maxSubArray(self, nums: list[int]) -> int:\n        cur_sum = 0\n        max_sum = nums[0]\n        for n in nums:\n            cur_sum = max(n, cur_sum + n)\n            max_sum = max(max_sum, cur_sum)\n        return max_sum`,
          cpp: `class Solution {\npublic:\n    int maxSubArray(vector<int>& nums) {\n        int curSum = 0, maxSum = nums[0];\n        for (int n : nums) {\n            curSum = max(n, curSum + n);\n            maxSum = max(maxSum, curSum);\n        }\n        return maxSum;\n    }\n};`,
          java: `class Solution {\n    public int maxSubArray(int[] nums) {\n        int curSum = 0, maxSum = nums[0];\n        for (int n : nums) {\n            curSum = Math.max(n, curSum + n);\n            maxSum = Math.max(maxSum, curSum);\n        }\n        return maxSum;\n    }\n}`,
          javascript: `function maxSubArray(nums) {\n  let curSum = 0, maxSum = nums[0];\n  for (const n of nums) {\n    curSum = Math.max(n, curSum + n);\n    maxSum = Math.max(maxSum, curSum);\n  }\n  return maxSum;\n}`
        },
        hints: [
          'If the current running sum drops below zero, starting a new subarray is strictly better than carrying a negative contribution.',
          "This dynamic programming approach is Kadane's algorithm."
        ],
        approach: "Kadane's Algorithm: Maintain cur_sum and max_sum. For each element n, cur_sum = max(n, cur_sum + n). Update max_sum = max(max_sum, cur_sum).",
        timeComplexity: 'O(N)',
        spaceComplexity: 'O(1)'
      }
    ]
  },
  {
    id: 'sheet-two-pointers',
    slug: 'two-pointers-and-sliding-window',
    title: 'Two Pointers & Sliding Window',
    shortDescription: 'Traverse sorted arrays and contiguous sequences efficiently using multi-pointer coordinates.',
    description: 'Learn how inward-moving pointers eliminate O(N²) quadratic loops in sorted sequences and how expanding/contracting windows process contiguous subarrays in linear O(N) time.',
    estimatedHours: 5,
    patternCount: 2,
    questions: [
      {
        id: 'q-valid-palindrome',
        slug: 'valid-palindrome',
        title: 'Valid Palindrome',
        difficulty: 'easy',
        pattern: 'Converging Two Pointers',
        problemStatement: 'A phrase is a palindrome if, after converting all uppercase letters into lowercase letters and removing all non-alphanumeric characters, it reads the same forward and backward. Alphanumeric characters include letters and numbers. Given a string s, return true if it is a palindrome, or false otherwise.',
        examples: [
          {
            input: 's = "A man, a plan, a canal: Panama"',
            output: 'true',
            explanation: '"amanaplanacanalpanama" is a palindrome.'
          },
          {
            input: 's = "race a car"',
            output: 'false',
            explanation: '"raceacar" is not a palindrome.'
          }
        ],
        constraints: [
          '1 <= s.length <= 2 * 10^5',
          's consists only of printable ASCII characters.'
        ],
        starterCode: {
          python: `class Solution:\n    def isPalindrome(self, s: str) -> bool:\n        left, right = 0, len(s) - 1\n        while left < right:\n            while left < right and not s[left].isalnum():\n                left += 1\n            while left < right and not s[right].isalnum():\n                right -= 1\n            if s[left].lower() != s[right].lower():\n                return False\n            left += 1\n            right -= 1\n        return True`,
          cpp: `class Solution {\npublic:\n    bool isPalindrome(string s) {\n        int l = 0, r = s.size() - 1;\n        while (l < r) {\n            while (l < r && !isalnum(s[l])) l++;\n            while (l < r && !isalnum(s[r])) r--;\n            if (tolower(s[l]) != tolower(s[r])) return false;\n            l++; r--;\n        }\n        return true;\n    }\n};`,
          java: `class Solution {\n    public boolean isPalindrome(String s) {\n        int l = 0, r = s.length() - 1;\n        while (l < r) {\n            while (l < r && !Character.isLetterOrDigit(s.charAt(l))) l++;\n            while (l < r && !Character.isLetterOrDigit(s.charAt(r))) r--;\n            if (Character.toLowerCase(s.charAt(l)) != Character.toLowerCase(s.charAt(r))) return false;\n            l++; r--;\n        }\n        return true;\n    }\n}`,
          javascript: `function isPalindrome(s) {\n  let l = 0, r = s.length - 1;\n  const isAlpha = (c) => /[a-zA-Z0-9]/.test(c);\n  while (l < r) {\n    while (l < r && !isAlpha(s[l])) l++;\n    while (l < r && !isAlpha(s[r])) r--;\n    if (s[l].toLowerCase() !== s[r].toLowerCase()) return false;\n    l++; r--;\n  }\n  return true;\n}`
        },
        hints: [
          'Two pointers starting from both ends can skip non-alphanumeric characters without creating a new string.'
        ],
        approach: 'Use two pointers (left at index 0, right at end). Increment left and decrement right while skipping non-alphanumeric characters. Compare lowercased characters.',
        timeComplexity: 'O(N)',
        spaceComplexity: 'O(1)'
      },
      {
        id: 'q-two-sum-ii',
        slug: 'two-sum-ii-sorted-array',
        title: 'Two Sum II (Sorted Input)',
        difficulty: 'medium',
        pattern: 'Converging Two Pointers',
        problemStatement: 'Given a 1-indexed array of integers numbers that is already sorted in non-decreasing order, find two numbers such that they add up to a specific target number. Return the indices of the two numbers, index1 and index2, as an integer array [index1, index2] of length 2.',
        examples: [
          {
            input: 'numbers = [2,7,11,15], target = 9',
            output: '[1,2]',
            explanation: 'The sum of 2 and 7 is 9. Therefore index1 = 1, index2 = 2. We return [1, 2].'
          }
        ],
        constraints: [
          '2 <= numbers.length <= 3 * 10^4',
          '-1000 <= numbers[i] <= 1000',
          'numbers is sorted in non-decreasing order.',
          'Exactly one solution exists.'
        ],
        starterCode: {
          python: `class Solution:\n    def twoSum(self, numbers: list[int], target: int) -> list[int]:\n        left, right = 0, len(numbers) - 1\n        while left < right:\n            curr = numbers[left] + numbers[right]\n            if curr == target:\n                return [left + 1, right + 1]\n            elif curr < target:\n                left += 1\n            else:\n                right -= 1\n        return []`,
          cpp: `class Solution {\npublic:\n    vector<int> twoSum(vector<int>& numbers, int target) {\n        int l = 0, r = numbers.size() - 1;\n        while (l < r) {\n            int sum = numbers[l] + numbers[r];\n            if (sum == target) return {l + 1, r + 1};\n            if (sum < target) l++;\n            else r--;\n        }\n        return {};\n    }\n};`,
          java: `class Solution {\n    public int[] twoSum(int[] numbers, int target) {\n        int l = 0, r = numbers.length - 1;\n        while (l < r) {\n            int sum = numbers[l] + numbers[r];\n            if (sum == target) return new int[]{l + 1, r + 1};\n            if (sum < target) l++;\n            else r--;\n        }\n        return new int[]{};\n    }\n}`,
          javascript: `function twoSum(numbers, target) {\n  let l = 0, r = numbers.length - 1;\n  while (l < r) {\n    const sum = numbers[l] + numbers[r];\n    if (sum === target) return [l + 1, r + 1];\n    if (sum < target) l++;\n    else r--;\n  }\n  return [];\n}`
        },
        hints: [
          'Because the array is sorted, if numbers[left] + numbers[right] < target, which pointer should move?'
        ],
        approach: 'Left starts at 0, right at length - 1. If sum is too small, advance left to increase sum. If sum is too large, decrement right to decrease sum.',
        timeComplexity: 'O(N)',
        spaceComplexity: 'O(1)'
      },
      {
        id: 'q-container-with-most-water',
        slug: 'container-with-most-water',
        title: 'Container With Most Water',
        difficulty: 'medium',
        pattern: 'Greedy Two Pointers',
        problemStatement: 'You are given an integer array height of length n. There are n vertical lines drawn such that the two endpoints of the ith line are (i, 0) and (i, height[i]). Find two lines that together with the x-axis form a container, such that the container contains the most water. Return the maximum amount of water a container can store.',
        examples: [
          {
            input: 'height = [1,8,6,2,5,4,8,3,7]',
            output: '49',
            explanation: 'The max area is formed between index 1 and 8 (height 8 and 7, width 7 -> 7*7 = 49).'
          }
        ],
        constraints: [
          'n == height.length',
          '2 <= n <= 10^5',
          '0 <= height[i] <= 10^4'
        ],
        starterCode: {
          python: `class Solution:\n    def maxArea(self, height: list[int]) -> int:\n        left, right = 0, len(height) - 1\n        max_water = 0\n        while left < right:\n            width = right - left\n            max_water = max(max_water, width * min(height[left], height[right]))\n            if height[left] < height[right]:\n                left += 1\n            else:\n                right -= 1\n        return max_water`,
          cpp: `class Solution {\npublic:\n    int maxArea(vector<int>& height) {\n        int l = 0, r = height.size() - 1, ans = 0;\n        while (l < r) {\n            ans = max(ans, (r - l) * min(height[l], height[r]));\n            if (height[l] < height[r]) l++;\n            else r--;\n        }\n        return ans;\n    }\n};`,
          java: `class Solution {\n    public int maxArea(int[] height) {\n        int l = 0, r = height.length - 1, ans = 0;\n        while (l < r) {\n            ans = Math.max(ans, (r - l) * Math.min(height[l], height[r]));\n            if (height[l] < height[r]) l++;\n            else r--;\n        }\n        return ans;\n    }\n}`,
          javascript: `function maxArea(height) {\n  let l = 0, r = height.length - 1, ans = 0;\n  while (l < r) {\n    ans = Math.max(ans, (r - l) * Math.min(height[l], height[r]));\n    if (height[l] < height[r]) l++;\n    else r--;\n  }\n  return ans;\n}`
        },
        hints: [
          'The area is limited by the shorter line.',
          'Moving the pointer at the shorter line might find a taller line, whereas moving the taller line can only decrease width without increasing height.'
        ],
        approach: 'Two pointers at ends. Compute area = (right - left) * min(height[left], height[right]). Advance the pointer with the smaller height greedily.',
        timeComplexity: 'O(N)',
        spaceComplexity: 'O(1)'
      }
    ]
  },
  {
    id: 'sheet-linked-lists',
    slug: 'linked-lists-and-recursion',
    title: 'Linked Lists & Recursion Foundations',
    shortDescription: 'Master node pointers, cycle detection, and recursive decomposition of linked structures.',
    description: 'Understand linear data structures at memory reference level. Learn fast/slow Floyd pointer techniques, list reversals, and sentinel dummy nodes.',
    estimatedHours: 4,
    patternCount: 2,
    questions: [
      {
        id: 'q-reverse-linked-list',
        slug: 'reverse-linked-list',
        title: 'Reverse Linked List',
        difficulty: 'easy',
        pattern: 'Iterative Pointer Reversal',
        problemStatement: 'Given the head of a singly linked list, reverse the list, and return the reversed list.',
        examples: [
          {
            input: 'head = [1,2,3,4,5]',
            output: '[5,4,3,2,1]'
          }
        ],
        constraints: [
          'The number of nodes in the list is the range [0, 5000].',
          '-5000 <= Node.val <= 5000'
        ],
        starterCode: {
          python: `class ListNode:\n    def __init__(self, val=0, next=None):\n        self.val = val\n        self.next = next\n\nclass Solution:\n    def reverseList(self, head: ListNode | None) -> ListNode | None:\n        prev = None\n        curr = head\n        while curr:\n            nxt = curr.next\n            curr.next = prev\n            prev = curr\n            curr = nxt\n        return prev`,
          cpp: `struct ListNode {\n    int val;\n    ListNode *next;\n    ListNode(int x) : val(x), next(nullptr) {}\n};\n\nclass Solution {\npublic:\n    ListNode* reverseList(ListNode* head) {\n        ListNode *prev = nullptr, *curr = head;\n        while (curr) {\n            ListNode *nxt = curr->next;\n            curr->next = prev;\n            prev = curr;\n            curr = nxt;\n        }\n        return prev;\n    }\n};`,
          java: `class Solution {\n    public ListNode reverseList(ListNode head) {\n        ListNode prev = null, curr = head;\n        while (curr != null) {\n            ListNode nxt = curr.next;\n            curr.next = prev;\n            prev = curr;\n            curr = nxt;\n        }\n        return prev;\n    }\n}`,
          javascript: `function reverseList(head) {\n  let prev = null, curr = head;\n  while (curr) {\n    const nxt = curr.next;\n    curr.next = prev;\n    prev = curr;\n    curr = nxt;\n  }\n  return prev;\n}`
        },
        hints: [
          'Maintain a pointer to the previous node and the next node before modifying curr.next.'
        ],
        approach: 'Iterative approach: Store next node, redirect current.next to prev, advance prev to current, advance current to next.',
        timeComplexity: 'O(N)',
        spaceComplexity: 'O(1)'
      },
      {
        id: 'q-linked-list-cycle',
        slug: 'linked-list-cycle',
        title: 'Linked List Cycle (Floyd)',
        difficulty: 'easy',
        pattern: 'Fast & Slow Pointers',
        problemStatement: 'Given head, the head of a linked list, determine if the linked list has a cycle in it. There is a cycle in a linked list if there is some node in the list that can be reached again by continuously following the next pointer. Return true if there is a cycle in the linked list. Otherwise, return false.',
        examples: [
          {
            input: 'head = [3,2,0,-4], pos = 1',
            output: 'true',
            explanation: 'There is a cycle in the linked list, where the tail connects to the 1st node (0-indexed).'
          }
        ],
        constraints: [
          'The number of the nodes in the list is in the range [0, 10^4].',
          '-10^5 <= Node.val <= 10^5'
        ],
        starterCode: {
          python: `class Solution:\n    def hasCycle(self, head: ListNode | None) -> bool:\n        slow = fast = head\n        while fast and fast.next:\n            slow = slow.next\n            fast = fast.next.next\n            if slow == fast:\n                return True\n        return False`,
          cpp: `class Solution {\npublic:\n    bool hasCycle(ListNode *head) {\n        ListNode *slow = head, *fast = head;\n        while (fast && fast->next) {\n            slow = slow->next;\n            fast = fast->next->next;\n            if (slow == fast) return true;\n        }\n        return false;\n    }\n};`,
          java: `public class Solution {\n    public boolean hasCycle(ListNode head) {\n        ListNode slow = head, fast = head;\n        while (fast != null && fast.next != null) {\n            slow = slow.next;\n            fast = fast.next.next;\n            if (slow == fast) return true;\n        }\n        return false;\n    }\n}`,
          javascript: `function hasCycle(head) {\n  let slow = head, fast = head;\n  while (fast && fast.next) {\n    slow = slow.next;\n    fast = fast.next.next;\n    if (slow === fast) return true;\n  }\n  return false;\n}`
        },
        hints: [
          "Think of two runners on a circular track. The faster runner will eventually lap the slower runner.",
          "Floyd's Tortoise and Hare algorithm detects cycles with O(1) space."
        ],
        approach: "Floyd's Cycle-Finding Algorithm: Advance slow by 1 step and fast by 2 steps. If there is a cycle, fast and slow will meet.",
        timeComplexity: 'O(N)',
        spaceComplexity: 'O(1)'
      }
    ]
  }
];

export function getPublicSheetBySlug(slug: string): DSASheet | null {
  return PUBLIC_DSA_SHEETS.find((s) => s.slug === slug) || null;
}

export function getAllPublicSheets(): DSASheet[] {
  return PUBLIC_DSA_SHEETS;
}
