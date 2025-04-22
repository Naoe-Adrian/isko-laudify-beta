(function () {
    const gpaButton = document.createElement('button');
    gpaButton.innerText = "🧮 GPA & Latin Honor";
    gpaButton.id = "gpa-button";
    document.body.appendChild(gpaButton);
  
    gpaButton.onclick = function () {
      let subjects = [];
      let semesterCategories = new Set(); // To store unique semester categories
      
      $('.tbldsp').each(function () {
        // Try to find the semester heading from the card title
        let semesterHeader = $(this).closest('.card').find('.card-header .card-title').text().trim();
        let semesterCategory = semesterHeader || "Uncategorized";
        
        semesterCategories.add(semesterCategory);
        
        $(this).find('tbody tr').each(function () {
          const cols = $(this).find('td');
          if (cols.length < 8) return; // Make sure we have enough columns
  
          const rowIndex = $(cols[0]).text().trim();
          const subjectCode = $(cols[1]).text().trim();
          const description = $(cols[2]).text().trim();
          const units = parseFloat($(cols[4]).text().trim());
          const finalGrade = parseFloat($(cols[6]).text().trim());
          const gradeStatus = $(cols[7]).text().trim();
  
          if (!isNaN(finalGrade) && !isNaN(units) && gradeStatus === 'P') {
            const shouldExclude = isExcludedFromLatinHonors(subjectCode, description);
            
            subjects.push({ 
              code: subjectCode, 
              desc: description, 
              units: units, 
              grade: finalGrade, 
              included: !shouldExclude,
              semester: semesterCategory 
            });
          }
        });
      });
  
      // Sort subjects by semester to group them properly
      subjects.sort((a, b) => {
        return a.semester.localeCompare(b.semester);
      });
  
      // Organize semesters into academic years
      const academicYears = organizeSemesters(semesterCategories);
  
      const modalDiv = document.createElement('div');
      modalDiv.id = 'gpa-modal';
      
      // Create filter dropdown for semesters/years
      const semesterDropdown = `
        <div class="filter-container">
          <label for="semester-filter">Filter by Academic Year/Semester:</label>
          <select id="semester-filter" class="semester-dropdown">
            <option value="all">All Semesters</option>
            ${generateAcademicYearOptions(academicYears)}
          </select>
        </div>
      `;
      
      const buttonGroup = `
        <div class="button-group">
          <button id="select-all-btn">Select All</button>
          <button id="unselect-all-btn">Unselect All</button>
          <button id="latin-honors-selection-btn">Latin Honors Selection</button>
        </div>
      `;
      
      const subjectsTable = `
        <div class="subjects-container">
          <table class="subjects-table">
            <thead>
              <tr>
                <th width="10%">Include</th>
                <th width="15%">Code</th>
                <th width="40%">Description</th>
                <th width="10%">Units</th>
                <th width="10%">Grade</th>
                <th width="15%">Semester</th>
              </tr>
            </thead>
            <tbody id="subjects-tbody">
              ${subjects.map((subj, i) => {
                // Create grade badge class based on grade value
                let gradeClass = '';
                if (subj.grade === 1.0) gradeClass = 'grade-1';
                else if (subj.grade === 1.25) gradeClass = 'grade-1-25';
                else if (subj.grade === 1.5 || subj.grade === 1.50) gradeClass = 'grade-1-5';
                else if (subj.grade === 1.75) gradeClass = 'grade-1-75';
                else if (subj.grade >= 2.0) gradeClass = 'grade-2';
                
                // Extract academic year from semester string
                const academicYear = extractAcademicYear(subj.semester);
                
                // Get semester type for badge styling
                const semesterType = getSemesterType(subj.semester);
                let semesterBadgeClass = '';
                if (semesterType === 'first') semesterBadgeClass = 'first-sem';
                else if (semesterType === 'second') semesterBadgeClass = 'second-sem';
                else if (semesterType === 'summer') semesterBadgeClass = 'summer';
                
                return `
                  <tr class="subject-row" data-semester="${subj.semester}" data-academic-year="${academicYear}">
                    <td>
                      <input type="checkbox" id="subj-${i}" data-i="${i}" class="custom-checkbox" ${subj.included ? 'checked' : ''}>
                    </td>
                    <td>${subj.code}</td>
                    <td>${subj.desc}</td>
                    <td>${subj.units}</td>
                    <td><span class="grade-badge ${gradeClass}">${subj.grade}</span></td>
                    <td><span class="semester-badge ${semesterBadgeClass}">${formatSemester(subj.semester)}</span></td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      `;
      
      // Create results area with tabs
      const resultsArea = `
        <button id="calc-gpa-btn">Calculate GPA</button>
        <div class="results-container" style="display: none;">
          <div class="tabs-container">
            <div class="tab-controls">
              <button class="tab-btn active" data-tab="results">Results</button>
              <button class="tab-btn" data-tab="breakdown">Computation Breakdown</button>
            </div>
            
            <div class="tab-content active" id="results-tab">
              <p id="gpa-result"></p>
              <p id="latin-honor-result"></p>
              <div class="honors-criteria">
                <p class="criteria-note">According to PUP Student Handbook 2019, Section 15.3:</p>
                <div class="criteria-item"><span class="criteria-range">1.00-1.15</span> <span class="criteria-honor summa">Summa Cum Laude</span></div>
                <div class="criteria-item"><span class="criteria-range">1.1501-1.35</span> <span class="criteria-honor magna">Magna Cum Laude</span></div>
                <div class="criteria-item"><span class="criteria-range">1.3501-1.6</span> <span class="criteria-honor cum">Cum Laude</span></div>
              </div>
            </div>
            
            <div class="tab-content" id="breakdown-tab">
              <div class="breakdown-info">
                <p>The table below shows how your GPA is calculated based on the selected courses.</p>
              </div>
              <div class="breakdown-table-container">
                <table class="breakdown-table">
                  <thead>
                    <tr>
                      <th>Subject Code</th>
                      <th>Description</th>
                      <th>Units</th>
                      <th>Grade</th>
                      <th>Grade Points</th>
                      <th>Weight</th>
                    </tr>
                  </thead>
                  <tbody id="breakdown-tbody">
                    <!-- Will be populated dynamically -->
                  </tbody>
                  <tfoot>
                    <tr id="breakdown-totals">
                      <td colspan="2" class="breakdown-total-label">Totals:</td>
                      <td id="total-units">-</td>
                      <td>-</td>
                      <td id="total-grade-points">-</td>
                      <td id="final-gpa">-</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
              <div class="breakdown-formula">
                <p>Formula: GPA = Total Grade Points ÷ Total Units</p>
              </div>
            </div>
          </div>
        </div>
        <button id="close-modal-btn">Close</button>
      `;
      
      modalDiv.innerHTML = `
        <h3>🎓 GPA & Latin Honor Calculator</h3>
        ${semesterDropdown}
        ${buttonGroup}
        ${subjectsTable}
        ${resultsArea}
      `;
      
      document.body.appendChild(modalDiv);
  
      // Add event listener for semester filter dropdown
      document.getElementById('semester-filter').addEventListener('change', function() {
        const selectedValue = this.value;
        
        if (selectedValue === 'all') {
          // Show all subjects
          $('.subject-row').show();
        } else if (selectedValue.startsWith('year-')) {
          // Show only subjects from the selected academic year
          const academicYear = selectedValue.replace('year-', '');
          $('.subject-row').hide();
          $(`.subject-row[data-academic-year="${academicYear}"]`).show();
        } else {
          // Show only subjects from the selected semester
          $('.subject-row').hide();
          $(`.subject-row[data-semester="${selectedValue}"]`).show();
        }
      });
  
      document.getElementById('close-modal-btn').onclick = () => {
        modalDiv.remove();
      };
  
      document.getElementById('select-all-btn').onclick = () => {
        // Only select visible subjects (respecting the filter)
        $('.subject-row:visible').each(function() {
          const id = $(this).find('input').attr('id');
          document.getElementById(id).checked = true;
        });
      };
  
      document.getElementById('unselect-all-btn').onclick = () => {
        // Only unselect visible subjects (respecting the filter)
        $('.subject-row:visible').each(function() {
          const id = $(this).find('input').attr('id');
          document.getElementById(id).checked = false;
        });
      };
  
      document.getElementById('latin-honors-selection-btn').onclick = () => {
        // Apply Latin honors selection only to visible subjects
        $('.subject-row:visible').each(function() {
          const checkboxId = $(this).find('input').attr('id');
          const subjectIndex = parseInt($(this).find('input').data('i'));
          document.getElementById(checkboxId).checked = subjects[subjectIndex].included;
        });
      };
  
      document.getElementById('calc-gpa-btn').onclick = () => {
        let totalGradePoints = 0;
        let totalUnits = 0;
        let includedSubjects = [];
  
        subjects.forEach((s, i) => {
          const checkbox = document.getElementById(`subj-${i}`);
          // Only calculate if the checkbox exists and is checked
          if (checkbox && checkbox.checked) {
            const gradePoints = s.grade * s.units;
            totalGradePoints += gradePoints;
            totalUnits += s.units;
            
            // Add to included subjects for breakdown
            includedSubjects.push({
              ...s,
              gradePoints: gradePoints,
              index: i
            });
          }
        });
  
        const gpa = totalUnits > 0 ? (totalGradePoints / totalUnits).toFixed(4) : 0;
        
        // Display results with a smooth animation
        const resultsContainer = document.querySelector('.results-container');
        resultsContainer.style.display = 'block';
        
        document.getElementById('gpa-result').innerHTML = `
          <span style="font-size: 16px;">Your GPA:</span> ${gpa}
        `;
        
        // Calculate Latin honor based on GPA
        const latinHonor = calculateLatinHonor(parseFloat(gpa));
        const honorClass = getHonorClass(latinHonor);
        
        document.getElementById('latin-honor-result').innerHTML = `
          <span class="honor-result ${honorClass}">${latinHonor}</span>
        `;
        
        // Highlight the achieved honor in the criteria list
        setTimeout(() => {
          const criteriaItems = document.querySelectorAll('.criteria-item');
          criteriaItems.forEach(item => {
            item.classList.remove('achieved');
            
            if (latinHonor.includes('Summa') && item.querySelector('.summa')) {
              item.classList.add('achieved');
            } else if (latinHonor.includes('Magna') && item.querySelector('.magna')) {
              item.classList.add('achieved');
            } else if (latinHonor.includes('Cum Laude') && !latinHonor.includes('Magna') && !latinHonor.includes('Summa') && item.querySelector('.cum')) {
              item.classList.add('achieved');
            }
          });
        }, 100);
        
        // Populate the breakdown table
        const breakdownTbody = document.getElementById('breakdown-tbody');
        let breakdownHtml = '';
        
        // Sort subjects by semester for better organization
        includedSubjects.sort((a, b) => a.semester.localeCompare(b.semester));
        
        includedSubjects.forEach(subj => {
          const percentContribution = ((subj.gradePoints / totalGradePoints) * 100).toFixed(1);
          breakdownHtml += `
            <tr>
              <td>${subj.code}</td>
              <td class="subject-desc">${subj.desc}</td>
              <td class="text-center">${subj.units}</td>
              <td class="text-center">${subj.grade}</td>
              <td class="text-center">${subj.gradePoints.toFixed(2)}</td>
              <td class="text-center">${percentContribution}%</td>
            </tr>
          `;
        });
        
        // If no subjects are included, show a message
        if (includedSubjects.length === 0) {
          breakdownHtml = `
            <tr>
              <td colspan="6" class="no-subjects">No subjects selected. Please select subjects to include in the calculation.</td>
            </tr>
          `;
        }
        
        breakdownTbody.innerHTML = breakdownHtml;
        
        // Update totals in the breakdown table
        document.getElementById('total-units').textContent = totalUnits;
        document.getElementById('total-grade-points').textContent = totalGradePoints.toFixed(2);
        document.getElementById('final-gpa').textContent = gpa;
        
        // Setup tab switching
        setupTabSwitching();
        
        // Scroll to see results if needed
        resultsContainer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      };
    };
  
    // Helper function to organize semesters into academic years
    function organizeSemesters(semesterSet) {
      const academicYears = {};
      
      semesterSet.forEach(semester => {
        const academicYear = extractAcademicYear(semester);
        if (!academicYears[academicYear]) {
          academicYears[academicYear] = [];
        }
        academicYears[academicYear].push(semester);
      });
      
      // Sort the semesters within each academic year in the correct order (1st Sem, 2nd Sem, Summer)
      for (const year in academicYears) {
        academicYears[year].sort((a, b) => {
          // Get the semester type (First, Second, Summer)
          const typeA = getSemesterType(a);
          const typeB = getSemesterType(b);
          
          // Define the order: 1st Sem (1), 2nd Sem (2), Summer (3)
          const orderMap = { 'first': 1, 'second': 2, 'summer': 3 };
          
          // Compare based on the predefined order
          return orderMap[typeA] - orderMap[typeB];
        });
      }
      
      return academicYears;
    }
  
    // Helper function to determine semester type (first, second, summer)
    function getSemesterType(semesterString) {
      semesterString = semesterString.toLowerCase();
      
      if (semesterString.includes('first') || semesterString.includes('1st')) {
        return 'first';
      } else if (semesterString.includes('second') || semesterString.includes('2nd')) {
        return 'second';
      } else if (semesterString.includes('summer')) {
        return 'summer';
      }
      
      // Default to 'first' if we can't determine
      return 'first';
    }
  
    // Helper function to extract academic year from semester string
    function extractAcademicYear(semesterString) {
      // Extract the first digits (e.g., "School Year 2122" -> "2122")
      const matches = semesterString.match(/\d{4}/);
      if (matches && matches.length > 0) {
        return matches[0];
      }
      return "Unknown";
    }
  
    // Helper function to generate dropdown options for academic years and semesters
    function generateAcademicYearOptions(academicYears) {
      let options = '';
      
      // Sort academic years in descending order (newest first)
      const sortedYears = Object.keys(academicYears).sort().reverse();
      
      sortedYears.forEach(year => {
        if (year !== "Unknown") {
          // Add option for the entire academic year
          options += `<option value="year-${year}">Year ${year.substring(0, 2)}-${year.substring(2)}</option>`;
          
          // Add options for individual semesters within this year
          // They are already sorted in correct order (1st, 2nd, Summer) by organizeSemesters
          academicYears[year].forEach(semester => {
            // Use non-breaking spaces for indentation (more reliable than regular spaces)
            options += `<option value="${semester}">&nbsp;&nbsp;&nbsp;${formatSemester(semester)}</option>`;
          });
        }
      });
      
      return options;
    }
  
    // Helper function to format semester string for display
    function formatSemester(semesterString) {
      // Extract the year part (e.g., "2122" from "School Year 2122 First Semester")
      const yearMatch = semesterString.match(/\d{4}/);
      let formattedSemester = semesterString;
      
      if (yearMatch && yearMatch.length > 0) {
        const year = yearMatch[0];
        const shortYear = `${year.substring(0, 2)}-${year.substring(2)}`;
        
        // Determine the semester type
        const semesterType = getSemesterType(semesterString);
        
        // Format based on semester type
        switch(semesterType) {
          case 'first':
            formattedSemester = `${shortYear} 1st Sem`;
            break;
          case 'second':
            formattedSemester = `${shortYear} 2nd Sem`;
            break;
          case 'summer':
            formattedSemester = `${shortYear} Summer`;
            break;
          default:
            // Keep the original format if we can't determine
            formattedSemester = `${shortYear} ${semesterString.split(" ").slice(-2).join(" ")}`;
        }
      }
      
      return formattedSemester;
    }
  
    // Function to determine if subject should be excluded from Latin honors calculation
    function isExcludedFromLatinHonors(code, desc) {
      // Based on PUP's rules for Latin Honors calculation
      
      // 1. NSTP subjects (CWTS)
      if (code.startsWith('NSTP') || code.startsWith('CWTS')) {
        return true;
      }
      
      // 2. Physical Education subjects
      if (code.startsWith('PHED')) {
        return true;
      }
      
      // 3. Non-numeric grades (like "P" without numeric equivalent)
      if (code === 'INTE 40173') { // Capstone Project 2 - has P grade
        return true;
      }
            
      return false;
    }
  
    // Function to determine Latin honor based on GPA
    function calculateLatinHonor(gpa) {
      // Based on PUP Student Handbook 2019, Section 15.3
      if (gpa >= 1.0 && gpa <= 1.15) {
        return "Summa Cum Laude 🏆";
      } else if (gpa >= 1.1501 && gpa <= 1.35) {
        return "Magna Cum Laude 🥇";
      } else if (gpa >= 1.3501 && gpa <= 1.6) {
        return "Cum Laude 🥈";
      } else {
        return "No Latin Honor";
      }
    }
  
    // Helper function to determine honor CSS class
    function getHonorClass(honor) {
      if (honor.includes('Summa')) {
        return 'summa-honor';
      } else if (honor.includes('Magna')) {
        return 'magna-honor';
      } else if (honor.includes('Cum Laude')) {
        return 'cum-honor';
      }
      return '';
    }
  
    // Setup tab switching functionality
    function setupTabSwitching() {
      const tabButtons = document.querySelectorAll('.tab-btn');
      const tabContents = document.querySelectorAll('.tab-content');
      
      tabButtons.forEach(button => {
        button.addEventListener('click', () => {
          // Remove active class from all buttons and contents
          tabButtons.forEach(btn => btn.classList.remove('active'));
          tabContents.forEach(content => content.classList.remove('active'));
          
          // Add active class to clicked button
          button.classList.add('active');
          
          // Show corresponding content
          const tabId = button.getAttribute('data-tab');
          document.getElementById(`${tabId}-tab`).classList.add('active');
        });
      });
    }
  })();
  