(function () {
    const gpaButton = document.createElement('button');
    gpaButton.innerText = "🧮 Isko-Laudify";
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
          if (cols.length < 8) return; 
  
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
  

      subjects.sort((a, b) => {
        return a.semester.localeCompare(b.semester);
      });
  

      const academicYears = organizeSemesters(semesterCategories);
  
      const modalDiv = document.createElement('div');
      modalDiv.id = 'gpa-modal';
      

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
                let gradeClass = '';
                if (subj.grade === 1.0) gradeClass = 'grade-1';
                else if (subj.grade === 1.25) gradeClass = 'grade-1-25';
                else if (subj.grade === 1.5 || subj.grade === 1.50) gradeClass = 'grade-1-5';
                else if (subj.grade === 1.75) gradeClass = 'grade-1-75';
                else if (subj.grade >= 2.0) gradeClass = 'grade-2';
                
                const academicYear = extractAcademicYear(subj.semester);
                
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
      
      const resultsArea = `
        <button id="calc-gpa-btn">Calculate GPA</button>        <div class="results-container" style="display: none;">
          <div class="tabs-container">
            <div class="tab-controls">
              <button class="tab-btn active" data-tab="results">Results</button>
              <button class="tab-btn" data-tab="breakdown">Computation Breakdown</button>
            <button id="export-pdf-btn" style="display: none;">📄 Export to PDF</button>
          </div>
            </div>
            
            <div class="tab-content active" id="results-tab">
              <p id="gpa-result"></p>
              <p id="latin-honor-result"></p>
              <div class="honors-criteria">
                <p class="criteria-note">According to University Student Handbook, Latin Honors Criteria:</p>
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
              </div>            </div>
          </div>
        </div>
        <button id="close-modal-btn">Close</button>
      `;
        modalDiv.innerHTML = `
        <h3>🎓 Isko-Laudify Calculator</h3>
        <div class="disclaimer-notice">
          <p><strong>📋 Notice:</strong> This tool provides GPA estimations for personal academic reference only. Not affiliated with PUP. For official records, consult the university registrar.</p>
        </div>
        ${semesterDropdown}
        ${buttonGroup}
        ${subjectsTable}
        ${resultsArea}
      `;
      
      document.body.appendChild(modalDiv);
  
      document.getElementById('semester-filter').addEventListener('change', function() {
        const selectedValue = this.value;
        
        if (selectedValue === 'all') {
          $('.subject-row').show();
        } else if (selectedValue.startsWith('year-')) {
          const academicYear = selectedValue.replace('year-', '');
          $('.subject-row').hide();
          $(`.subject-row[data-academic-year="${academicYear}"]`).show();
        } else {
          $('.subject-row').hide();
          $(`.subject-row[data-semester="${selectedValue}"]`).show();
        }
      });
  
      document.getElementById('close-modal-btn').onclick = () => {
        modalDiv.remove();
      };
  
      document.getElementById('select-all-btn').onclick = () => {
        $('.subject-row:visible').each(function() {
          const id = $(this).find('input').attr('id');
          document.getElementById(id).checked = true;
        });
      };
  
      document.getElementById('unselect-all-btn').onclick = () => {
        $('.subject-row:visible').each(function() {
          const id = $(this).find('input').attr('id');
          document.getElementById(id).checked = false;
        });
      };
  
      document.getElementById('latin-honors-selection-btn').onclick = () => {
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
          if (checkbox && checkbox.checked) {
            const gradePoints = s.grade * s.units;
            totalGradePoints += gradePoints;
            totalUnits += s.units;

            includedSubjects.push({
              ...s,
              gradePoints: gradePoints,
              index: i
            });
          }
        });
  
        const gpa = totalUnits > 0 ? (totalGradePoints / totalUnits).toFixed(4) : 0;
        
        const resultsContainer = document.querySelector('.results-container');
        resultsContainer.style.display = 'block';
        
        document.getElementById('gpa-result').innerHTML = `
          <span style="font-size: 16px;">Your GPA:</span> ${gpa}
        `;
        
        const latinHonor = calculateLatinHonor(parseFloat(gpa));
        const honorClass = getHonorClass(latinHonor);
        
        document.getElementById('latin-honor-result').innerHTML = `
          <span class="honor-result ${honorClass}">${latinHonor}</span>
        `;
        
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
        
        const breakdownTbody = document.getElementById('breakdown-tbody');
        let breakdownHtml = '';
        
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
        
        if (includedSubjects.length === 0) {
          breakdownHtml = `
            <tr>
              <td colspan="6" class="no-subjects">No subjects selected. Please select subjects to include in the calculation.</td>
            </tr>
          `;
        }
        
        breakdownTbody.innerHTML = breakdownHtml;

        document.getElementById('total-units').textContent = totalUnits;
        document.getElementById('total-grade-points').textContent = totalGradePoints.toFixed(2);
        document.getElementById('final-gpa').textContent = gpa;
        setupTabSwitching();
        
        document.getElementById('export-pdf-btn').style.display = 'inline-block';
        
        resultsContainer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });   
        document.getElementById('export-pdf-btn').onclick = () => {
          const btn = document.getElementById('export-pdf-btn');
          const originalText = btn.textContent;
          
          btn.textContent = '📄 Generating PDF...';
          btn.disabled = true;
          
          try {
            if (typeof window.jspdf === 'undefined') {
              throw new Error('jsPDF library not found. Please refresh the page.');
            }
            
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF();
            
            doc.setFontSize(20);
            doc.text('GPA Computation Report', 105, 20, { align: 'center' });
            
            doc.setFontSize(14);
            doc.text(`Final GPA: ${gpa}`, 20, 40);
            doc.text(`Latin Honor: ${latinHonor.replace(/[🏆🥇🥈]/g, '').trim()}`, 20, 55);
            
            if (typeof doc.autoTable === 'function') {
              console.log('AutoTable is available, generating enhanced PDF');
              generatePDFReport(includedSubjects, parseFloat(gpa), latinHonor);
            } else {
              console.log('AutoTable not available, generating basic PDF');
              
              let yPos = 80;
              doc.setFontSize(12);
              doc.text('Included Subjects:', 20, yPos);
              yPos += 10;
              
              doc.setFontSize(10);
              includedSubjects.forEach(subject => {
                if (yPos > 270) {
                  doc.addPage();
                  yPos = 20;
                }
                doc.text(`${subject.code} - ${subject.desc} (${subject.units} units, Grade: ${subject.grade})`, 20, yPos);
                yPos += 8;
              });
              
              const timestamp = new Date().toISOString().slice(0, 19).replace(/[:-]/g, '');
              doc.save(`GPA_Report_Basic_${timestamp}.pdf`);
            }
            
            btn.textContent = '✅ PDF Generated!';
            setTimeout(() => {
              btn.textContent = originalText;
              btn.disabled = false;
            }, 2000);
            
          } catch (error) {
            console.error('PDF generation error:', error);
            alert(`PDF Error: ${error.message}`);
            btn.textContent = '❌ Error - Try Again';
            setTimeout(() => {
              btn.textContent = originalText;
              btn.disabled = false;
            }, 3000);
          }
        };
      };
    };
  
    function organizeSemesters(semesterSet) {
      const academicYears = {};
      
      semesterSet.forEach(semester => {
        const academicYear = extractAcademicYear(semester);
        if (!academicYears[academicYear]) {
          academicYears[academicYear] = [];
        }
        academicYears[academicYear].push(semester);
      });
      
      for (const year in academicYears) {
        academicYears[year].sort((a, b) => {

          const typeA = getSemesterType(a);
          const typeB = getSemesterType(b);
          
          const orderMap = { 'first': 1, 'second': 2, 'summer': 3 };
          
          return orderMap[typeA] - orderMap[typeB];
        });
      }
      
      return academicYears;
    }
  
    function getSemesterType(semesterString) {
      semesterString = semesterString.toLowerCase();
      
      if (semesterString.includes('first') || semesterString.includes('1st')) {
        return 'first';
      } else if (semesterString.includes('second') || semesterString.includes('2nd')) {
        return 'second';
      } else if (semesterString.includes('summer')) {
        return 'summer';
      }
      

      return 'first';
    }

    function extractAcademicYear(semesterString) {
      const matches = semesterString.match(/\d{4}/);
      if (matches && matches.length > 0) {
        return matches[0];
      }
      return "Unknown";
    }
  
    function generateAcademicYearOptions(academicYears) {
      let options = '';
      

      const sortedYears = Object.keys(academicYears).sort().reverse();
      
      sortedYears.forEach(year => {
        if (year !== "Unknown") {

          options += `<option value="year-${year}">Year ${year.substring(0, 2)}-${year.substring(2)}</option>`;
          
          academicYears[year].forEach(semester => {
            options += `<option value="${semester}">&nbsp;&nbsp;&nbsp;${formatSemester(semester)}</option>`;
          });
        }
      });
      
      return options;
    }
  
    function formatSemester(semesterString) {
      const yearMatch = semesterString.match(/\d{4}/);
      let formattedSemester = semesterString;
      
      if (yearMatch && yearMatch.length > 0) {
        const year = yearMatch[0];
        const shortYear = `${year.substring(0, 2)}-${year.substring(2)}`;
        
        const semesterType = getSemesterType(semesterString);
        
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
            formattedSemester = `${shortYear} ${semesterString.split(" ").slice(-2).join(" ")}`;
        }
      }
      
      return formattedSemester;
    }
  
    function isExcludedFromLatinHonors(code) {

      if (code.startsWith('NSTP') || code.startsWith('CWTS')) {
        return true;
      }
      
      if (code.startsWith('PHED')) {
        return true;
      }
      if (code.startsWith('PATHFit ') || code.startsWith('PATH')) {
        return true;
      }

      return false;
    }

    function calculateLatinHonor(gpa) {
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

    function setupTabSwitching() {
      const tabButtons = document.querySelectorAll('.tab-btn');
      const tabContents = document.querySelectorAll('.tab-content');
      
      tabButtons.forEach(button => {
        button.addEventListener('click', () => {
          tabButtons.forEach(btn => btn.classList.remove('active'));
          tabContents.forEach(content => content.classList.remove('active'));
          
          button.classList.add('active');
          
          const tabId = button.getAttribute('data-tab');
          document.getElementById(`${tabId}-tab`).classList.add('active');
        });
      });
    }    
    function generatePDFReport(includedSubjects, finalGPA, latinHonor) {
      try {
        if (typeof window.jspdf === 'undefined') {
          throw new Error('jsPDF library not loaded');
        }
        
        const { jsPDF } = window.jspdf;
        if (typeof jsPDF.API.autoTable !== 'function') {
          throw new Error('jsPDF autoTable plugin not loaded');
        }
        
        const doc = new jsPDF();
        
        const groupedData = groupSubjectsByYearSemester(includedSubjects);
        
        generateOverallSummaryPage(doc, groupedData, finalGPA, latinHonor);
        
        generateDetailedBreakdownPages(doc, groupedData);
        
        const now = new Date();
        const timestamp = now.toISOString().slice(0, 19).replace(/[:-]/g, '');
        const filename = `GPA_Report_${timestamp}.pdf`;
        
        doc.save(filename);
      } catch (error) {
        console.error('Error generating PDF:', error);
        alert(`Error generating PDF report: ${error.message}. Please ensure all required libraries are loaded.`);
        throw error;
      }
    }    function groupSubjectsByYearSemester(subjects) {
      const grouped = {};
      
      subjects.forEach(subject => {
        const academicYear = extractAcademicYear(subject.semester);
        const semesterType = getSemesterType(subject.semester);
        
        const yearLevel = getYearLevelFromAcademicYear(academicYear, subjects);
        const key = `${yearLevel}-${academicYear}-${semesterType}`;
        
        if (!grouped[key]) {
          grouped[key] = {
            academicYear: academicYear,
            semesterType: semesterType,
            yearLevel: yearLevel,
            semester: subject.semester,
            subjects: [],
            totalUnits: 0,
            totalGradePoints: 0
          };
        }
        
        grouped[key].subjects.push(subject);
        grouped[key].totalUnits += subject.units;
        grouped[key].totalGradePoints += (subject.grade * subject.units);
      });
      
      Object.keys(grouped).forEach(key => {
        const group = grouped[key];
        group.gwa = group.totalUnits > 0 ? (group.totalGradePoints / group.totalUnits) : 0;
      });
      
      return grouped;
    }  
    function getYearLevelFromAcademicYear(academicYear, allSubjects = []) {
      const academicYearInt = parseInt(academicYear);
      
      const allAcademicYears = allSubjects
        .map(subject => parseInt(extractAcademicYear(subject.semester)))
        .filter(year => !isNaN(year))
        .sort((a, b) => a - b);
      
      const uniqueYears = [...new Set(allAcademicYears)];
    
      let baseYear = uniqueYears.length > 0 ? uniqueYears[0] : 2122;
      
      const yearDifference = academicYearInt - baseYear;
      const yearLevel = Math.floor(yearDifference / 101) + 1;
      
      const clampedYearLevel = Math.max(1, Math.min(6, yearLevel));
      
      return clampedYearLevel.toString();
    }function generateOverallSummaryPage(doc, groupedData, finalGPA, latinHonor) {

      doc.setFillColor(139, 0, 0); 
      doc.rect(0, 0, 210, 30, 'F');
      
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(16);
      doc.setFont(undefined, 'bold');
      doc.text('ISKO-LAUDIFY PDF REPORT', 105, 12, { align: 'center' });
      
      doc.setFontSize(14);
      doc.text('GPA COMPUTATION SUMMARY', 105, 22, { align: 'center' });
      
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(10);
      doc.setFont(undefined, 'normal');
      const now = new Date();
      const dateStr = now.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });
      doc.text(`Generated on: ${dateStr}`, 105, 40, { align: 'center' });
      const tableData = [];
      const yearColors = {
        '1': [255, 230, 230], 
        '2': [255, 240, 240], 
        '3': [250, 220, 220], 
        '4': [245, 210, 210], 
        '5': [240, 200, 200], 
        '6': [235, 190, 190]  
      };
        let totalUnits = 0;
      let totalGradePoints = 0;
      const sortedKeys = Object.keys(groupedData).sort((a, b) => {
        const [yearLevelA, academicYearA, semA] = a.split('-');
        const [yearLevelB, academicYearB, semB] = b.split('-');
        const yearNumA = parseInt(yearLevelA);
        const yearNumB = parseInt(yearLevelB);
        
        if (yearNumA !== yearNumB) {
          return yearNumA - yearNumB;
        }
        
        if (academicYearA !== academicYearB) {
          return academicYearA.localeCompare(academicYearB);
        }
        
        const semesterOrder = { 'first': 1, 'second': 2, 'summer': 3 };
        return semesterOrder[semA] - semesterOrder[semB];
      });
      
      sortedKeys.forEach(key => {
        const group = groupedData[key];
        const yearLevel = getYearLevelDisplay(group.yearLevel);
        const semesterDisplay = getSemesterDisplay(group.semesterType);
        const weightedScore = group.totalGradePoints;
          tableData.push([
          yearLevel,
          semesterDisplay,
          group.totalUnits.toString(),
          group.gwa.toFixed(2), 
          weightedScore.toFixed(2)
        ]);
        
        totalUnits += group.totalUnits;
        totalGradePoints += group.totalGradePoints;
      });
      
      tableData.push([
        'TOTAL',
        '',
        totalUnits.toString(),
        '',
        totalGradePoints.toFixed(2)
      ]);
      doc.autoTable({
        head: [['YEAR LEVEL', 'SEMESTER', 'UNITS', 'GWA', 'GRADE POINTS']],
        body: tableData,
        startY: 50,
        styles: {
          fontSize: 10,
          halign: 'center',
          valign: 'middle',
          cellPadding: 6
        },
        headStyles: {
          fillColor: [139, 0, 0], 
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          fontSize: 11
        },
        didDrawCell: function(data) {
          if (data.section === 'body' && data.row.index < tableData.length - 1) {
            const yearLevel = tableData[data.row.index][0];
            const yearNumber = yearLevel.match(/(\d+)/)?.[1];
            
            if (yearNumber && yearColors[yearNumber]) {
              data.cell.styles.fillColor = yearColors[yearNumber];
            }
          }
          if (data.section === 'body' && data.row.index === tableData.length - 1) {
            data.cell.styles.fillColor = [220, 220, 220];
            data.cell.styles.fontStyle = 'bold';
            data.cell.styles.textColor = [139, 0, 0]; 
          }
        }
      });     
      const finalY = doc.lastAutoTable.finalY + 20;
      
      if (finalY > 240) {
        doc.addPage();
        const newFinalY = 30;

        doc.setTextColor(0, 0, 0)
        doc.setFontSize(12);
        doc.setFont(undefined, 'bold');
        
        const cleanLatinHonor = latinHonor.replace(/[🏆🥇🥈]/g, '').trim();
        doc.text(`Final GWA: ${finalGPA.toFixed(2)} | Latin Honor: ${cleanLatinHonor}`, 105, newFinalY, { align: 'center' });
        
        const disclaimerY = newFinalY + 25;
        addDisclaimerFooter(doc, disclaimerY);
      } else {
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(12);
        doc.setFont(undefined, 'bold');
        
        const cleanLatinHonor = latinHonor.replace(/[🏆🥇🥈]/g, '').trim();
        doc.text(`Final GWA: ${finalGPA.toFixed(2)} | Latin Honor: ${cleanLatinHonor}`, 105, finalY, { align: 'center' });
        
        const disclaimerY = finalY + 25;
        addDisclaimerFooter(doc, disclaimerY);
      }
    }    function generateDetailedBreakdownPages(doc, groupedData) {
      const sortedKeys = Object.keys(groupedData).sort((a, b) => {
        const [yearLevelA, academicYearA, semA] = a.split('-');
        const [yearLevelB, academicYearB, semB] = b.split('-');
        
        const yearNumA = parseInt(yearLevelA);
        const yearNumB = parseInt(yearLevelB);
        
        if (yearNumA !== yearNumB) {
          return yearNumA - yearNumB;
        }
        
        if (academicYearA !== academicYearB) {
          return academicYearA.localeCompare(academicYearB);
        }
        
        const semesterOrder = { 'first': 1, 'second': 2, 'summer': 3 };
        return semesterOrder[semA] - semesterOrder[semB];
      });
      
      sortedKeys.forEach((key, index) => {
        const group = groupedData[key];

        doc.addPage();
        
        const yearLevel = getYearLevelDisplay(group.yearLevel);
        const semesterDisplay = getSemesterDisplay(group.semesterType);
        
        doc.setFillColor(139, 0, 0);
        doc.rect(0, 0, 210, 25, 'F');
        
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(14);
        doc.setFont(undefined, 'bold');
        doc.text('DETAILED BREAKDOWN', 105, 15, { align: 'center' });
        
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(16);
        doc.setFont(undefined, 'bold');
        doc.text(`${yearLevel} - ${semesterDisplay}`, 20, 40);
        
        doc.setFontSize(10);
        doc.setFont(undefined, 'italic');
        doc.text(`Academic Year: ${group.academicYear.substring(0, 2)}-${group.academicYear.substring(2)}`, 20, 48);
        

        const subjectData = group.subjects.map(subject => [
          subject.code,
          subject.desc,
          subject.units.toString(),
          subject.grade.toString()
        ]);

        subjectData.push([
          'SEMESTER TOTAL',
          '',
          group.totalUnits.toString(),
          `GWA: ${group.gwa.toFixed(2)}`
        ]);

        doc.autoTable({
          head: [['Subject Code', 'Description', 'Units', 'Grade']],
          body: subjectData,
          startY: 55,
          styles: {
            fontSize: 9,
            halign: 'center',
            valign: 'middle',
            cellPadding: 5
          },
          headStyles: {
            fillColor: [139, 0, 0], 
            textColor: [255, 255, 255],
            fontStyle: 'bold',
            fontSize: 10
          },
          columnStyles: {
            0: { halign: 'center', cellWidth: 35 },
            1: { halign: 'left', cellWidth: 'auto' },
            2: { halign: 'center', cellWidth: 25 },
            3: { halign: 'center', cellWidth: 25 }
          },
          didDrawCell: function(data) {

            if (data.section === 'body' && data.row.index === subjectData.length - 1) {
              data.cell.styles.fillColor = [220, 220, 220];
              data.cell.styles.fontStyle = 'bold';
              data.cell.styles.fontSize = 10;
              data.cell.styles.textColor = [139, 0, 0];
            }
          }        });
          const tableEndY = doc.lastAutoTable.finalY;
        const disclaimerY = Math.max(tableEndY + 20, 230); 
        addDisclaimerFooter(doc, disclaimerY);
      });
    }

    function getSemesterDisplay(semesterType) {
      switch(semesterType) {
        case 'first': return '1st Semester';
        case 'second': return '2nd Semester';
        case 'summer': return 'Summer';
        default: return semesterType;
      }
    }

    function getYearLevelDisplay(yearLevel) {
      switch(yearLevel) {
        case '1': return '1st Year';
        case '2': return '2nd Year';
        case '3': return '3rd Year';
        case '4': return '4th Year';
        case '5': return '5th Year';
        case '6': return '6th Year';
        default: return yearLevel + ' Year';
      }
    }   
    function addDisclaimerFooter(doc, startY) {
      if (startY > 260) {
        doc.addPage();
        startY = 30;
      }

      doc.setTextColor(0, 0, 0);
      doc.setFontSize(7);
      doc.setFont(undefined, 'normal');
      doc.text('Generated by Isko-Laudify Extension', 105, startY, { align: 'center' });
      
      doc.setFont(undefined, 'bold');
      doc.setFontSize(8);
      doc.text('DISCLAIMER', 105, startY + 8, { align: 'center' });
      
      doc.setFont(undefined, 'normal');
      doc.setFontSize(6);
      
      const disclaimerLines = [
        'This report is for personal academic reference and grade estimation only. Not affiliated with PUP.',
        'For official records and verification, consult the university registrar.',
        'Developer assumes no responsibility for academic decisions based on this tool.'
      ];
      
      disclaimerLines.forEach((line, index) => {
        doc.text(line, 105, startY + 16 + (index * 4), { align: 'center' });
      });
    }
  })();
